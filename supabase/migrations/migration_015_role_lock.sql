-- ============================================================
-- GLIDE — migration_015_role_lock.sql  (Sprint V.0 · C-1)
-- Blocca l'auto-escalation di privilegi: un utente autenticato NON può
-- cambiare `profiles.role` (né promuoversi a 'coach'). Il cambio di ruolo
-- resta possibile SOLO a service_role/postgres (creazione via admin,
-- promozione manuale del coach). Il nuotatore continua a poter aggiornare
-- gli altri campi del proprio profilo senza errori.
-- ============================================================

create or replace function public.protect_role_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Se cambia `role` e chi scrive è un ruolo "client" (anon/authenticated) → rifiuta.
  if new.role is distinct from old.role
     and current_user in ('authenticated', 'anon') then
    raise exception 'Modifica del ruolo del profilo non consentita.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Non è un RPC (ritorna trigger): nessuno deve poterla invocare direttamente.
revoke execute on function public.protect_role_column() from public;

drop trigger if exists protect_role_column on public.profiles;
create trigger protect_role_column
  before update on public.profiles
  for each row execute function public.protect_role_column();
