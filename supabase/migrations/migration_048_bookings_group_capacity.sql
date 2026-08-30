-- ============================================================
-- GLIDE — migration_048_bookings_group_capacity.sql (Sprint C.3)
-- L'EXCLUDE esistente (bookings_no_overlap) blocca QUALSIASI overlap di
-- orario per lo stesso coach — corretto per capacity=1, ma impedirebbe
-- anche il 2° booking su uno slot di lezione di gruppo. Introduce:
--  1) conflict_key: per servizi capacity=1 è univoca per riga (comportamento
--     invariato: qualsiasi overlap blocca). Per servizi capacity>1 è il
--     service_id: righe della STESSA lezione di gruppo condividono la
--     chiave e quindi NON si escludono a vicenda; l'overlap con un servizio
--     diverso resta bloccato come oggi.
--  2) trigger di capienza: conteggio atomico (lock deterministico) che
--     rifiuta l'insert oltre services.capacity sullo stesso
--     (coach_id, starts_at, service_id).
-- ============================================================

alter table public.bookings
  add column conflict_key uuid not null default gen_random_uuid();

create or replace function public.bookings_set_conflict_key()
returns trigger language plpgsql set search_path = public as $$
declare cap int;
begin
  select capacity into cap from public.services where id = new.service_id;
  if cap is not null and cap > 1 then
    new.conflict_key := new.service_id;
  else
    new.conflict_key := gen_random_uuid();
  end if;
  return new;
end $$;

create trigger bookings_conflict_key_bi
before insert or update of service_id on public.bookings
for each row execute function public.bookings_set_conflict_key();

-- Backfill: applica la regola alle righe esistenti (tutte capacity=1 oggi).
update public.bookings b
   set conflict_key = case
     when s.capacity > 1 then s.id
     else gen_random_uuid()
   end
  from public.services s
 where b.service_id = s.id;

alter table public.bookings
  drop constraint bookings_no_overlap,
  add constraint bookings_no_overlap
    exclude using gist (
      coach_id with =,
      tstzrange(starts_at, block_until, '[)') with &&,
      conflict_key with <>
    ) where (status = ANY (ARRAY['pending'::text, 'confirmed'::text]));

create or replace function public.bookings_check_capacity()
returns trigger language plpgsql set search_path = public as $$
declare cap int; cnt int;
begin
  if new.status not in ('pending','confirmed') then return new; end if;

  select capacity into cap from public.services where id = new.service_id;
  if cap is null then cap := 1; end if;

  -- Lock deterministico sulla stessa (coach, slot, servizio): rende atomico
  -- il conteggio anche con inserimenti concorrenti sullo stesso slot.
  perform pg_advisory_xact_lock(
    hashtextextended(new.coach_id::text || new.starts_at::text || new.service_id::text, 0)
  );

  select count(*) into cnt
    from public.bookings
   where coach_id = new.coach_id
     and service_id = new.service_id
     and starts_at = new.starts_at
     and status in ('pending','confirmed')
     and id is distinct from new.id;

  if cnt >= cap then
    raise exception 'slot pieno' using errcode = '23505';
  end if;
  return new;
end $$;

create trigger bookings_capacity_bi
before insert on public.bookings
for each row execute function public.bookings_check_capacity();
