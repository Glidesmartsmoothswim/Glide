-- ============================================================
-- GLIDE — migration_039_rpc_ownership_checks.sql
-- SECURITY_AUDIT.md, "Extra" (S-0 bis, 21 ago) → C-6/C-7: 7 funzioni
-- SECURITY DEFINER chiamabili via /rest/v1/rpc/... da anon/authenticated
-- erano state segnalate ma non verificate nel corpo. Verificate ora:
--
-- FIX ARANCIO (C-7) — grant_monthly_tokens(): pensata per il solo cron
-- (già chiamata da service_role/postgres via pg_cron), ma con EXECUTE
-- ancora concesso ad anon/authenticated nonostante il `revoke ... from
-- public` in migration_024/027 (grant separato, non coperto da quel
-- revoke — verificato live su information_schema.routine_privileges).
--
-- FIX ROSSO (C-6) — link_lesson_token / release_lesson_token /
-- reserve_lesson_token: nessuna delle tre verificava che il token/swimmer
-- passato come argomento appartenesse al chiamante (IDOR). Le uniche
-- chiamate legittime nel codice (src/app/api/booking/create/route.ts)
-- passano già solo l'id del nuotatore autenticato e vanno via
-- `admin.rpc(...)` (service_role) — quel percorso resta intatto perché
-- exentato dal check (già autorizzato a monte, nella route). Il buco è
-- l'accesso DIRETTO via REST con la chiave anon/authenticated: lì
-- auth.uid() è quello reale del chiamante, e senza check si poteva
-- passare l'id di un altro nuotatore/token.
--
-- Regola di ownership (invariata, non è una decisione presa qui):
-- coach = accesso a tutti via is_coach(), swimmer = solo il proprio
-- auth.uid() — stessa regola già in vigore nello schema (RLS lesson_tokens,
-- migration_024).
-- ============================================================

-- --- FIX ARANCIO (C-7) --------------------------------------------------------
revoke execute on function public.grant_monthly_tokens() from anon, authenticated;
-- service_role/postgres non sono soggetti al revoke: il cron pg_cron
-- (migration_024/027, ruolo postgres) continua a funzionare invariato.

-- --- FIX ROSSO (C-6) ----------------------------------------------------------

-- reserve_lesson_token: solo il proprietario del token (p_swimmer) o il
-- coach possono riservarlo. Chiamata interna (service_role, dalla route di
-- booking) esentata: è già autorizzata a monte.
create or replace function public.reserve_lesson_token(p_swimmer uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  -- NB: `not (auth.uid() = p_swimmer or is_coach())` sarebbe NULL (non TRUE)
  -- quando auth.uid() è NULL (chiamante anon, nessun 'sub' nel JWT) — logica
  -- a tre valori di SQL: NULL or false = NULL, not NULL = NULL, e `if NULL`
  -- non entra mai nel ramo. Con quella forma un anon senza identità avrebbe
  -- bypassato silenziosamente il controllo. `is not true` è NULL-safe: vale
  -- true sia per false sia per NULL.
  if auth.role() is distinct from 'service_role'
     and (auth.uid() = p_swimmer or public.is_coach()) is not true
  then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.lesson_tokens
     set redeemed_at = now()
   where id = (
     select id from public.lesson_tokens
      where swimmer_id = p_swimmer
        and redeemed_at is null
        and (expires_at is null or expires_at > now())
      order by expires_at nulls last, granted_at
      limit 1
      for update skip locked
   )
   returning id into tid;
  return tid;
end $$;

-- link_lesson_token: solo il proprietario del token (swimmer_id) o il
-- coach possono legarlo a una prenotazione. Stessa esenzione service_role.
create or replace function public.link_lesson_token(p_token uuid, p_booking uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.role() is distinct from 'service_role'
     and not exists (
       select 1 from public.lesson_tokens
        where id = p_token
          and (swimmer_id = auth.uid() or public.is_coach())
     )
  then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.lesson_tokens set redeemed_booking_id = p_booking where id = p_token;
end $$;

-- release_lesson_token: stessa verifica di ownership di link_lesson_token.
create or replace function public.release_lesson_token(p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.role() is distinct from 'service_role'
     and not exists (
       select 1 from public.lesson_tokens
        where id = p_token
          and (swimmer_id = auth.uid() or public.is_coach())
     )
  then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.lesson_tokens
     set redeemed_at = null, redeemed_booking_id = null
   where id = p_token;
end $$;
