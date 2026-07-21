-- ============================================================
-- GLIDE — migration_024_lesson_tokens.sql  (Onda 13.6)
-- Token lezione per gli 1:1: 1 token/mese (scade fine mese, no accumulo) +
-- token regalo del coach (non scadono). Spendibile su UNA lezione, atomico.
-- NB: `lesson_credits` (entitlement di piano) resta separato: qui è il token
-- "lezione inclusa" del percorso 1:1, con redeem legato alla prenotazione.
-- ============================================================

create table if not exists public.lesson_tokens (
  id uuid primary key default gen_random_uuid(),
  swimmer_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('mensile','coach')),
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_booking_id uuid references public.bookings(id) on delete set null,
  note text,
  -- Un token per lezione: niente due token sulla stessa prenotazione.
  unique (redeemed_booking_id)
);

alter table public.lesson_tokens enable row level security;

-- Legge: proprietario o coach.
drop policy if exists "tokens: proprietario o coach" on public.lesson_tokens;
create policy "tokens: proprietario o coach" on public.lesson_tokens
  for select to public using (swimmer_id = auth.uid() or public.is_coach());

-- Inserisce: solo il coach (regalo). Emissione mensile e redeem: service_role.
drop policy if exists "tokens: il coach regala" on public.lesson_tokens;
create policy "tokens: il coach regala" on public.lesson_tokens
  for insert to public with check (public.is_coach());

create index if not exists lesson_tokens_swimmer_idx
  on public.lesson_tokens (swimmer_id, redeemed_at, expires_at);

-- Emissione mensile: 1 token a ogni 1:1 attivo, scadenza fine mese corrente,
-- una sola volta al mese. Ritorna quanti ne ha accreditati.
create or replace function public.grant_monthly_tokens()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into public.lesson_tokens (swimmer_id, source, expires_at)
  select p.id, 'mensile',
         (date_trunc('month', now()) + interval '1 month' - interval '1 second')
  from public.profiles p
  where p.tier = 'one_to_one'
    and not exists (
      select 1 from public.lesson_tokens t
      where t.swimmer_id = p.id
        and t.source = 'mensile'
        and t.granted_at >= date_trunc('month', now())
    );
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.grant_monthly_tokens() from public;

-- pg_cron: primo del mese alle 04:00 UTC.
create extension if not exists pg_cron;
select cron.schedule(
  'grant-monthly-tokens',
  '0 4 1 * *',
  $$ select public.grant_monthly_tokens(); $$
);
