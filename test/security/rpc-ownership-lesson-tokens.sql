-- Test di regressione C-6 (IDOR su RPC lesson token) e C-7 (grant_monthly_tokens
-- pubblica). Fallisce (RAISE) se i fix vengono rimossi. Verifica la STRUTTURA
-- della difesa (corpo funzione + grant), non l'impersonazione: quella è stata
-- eseguita LIVE sul DB reale, impersonando due nuotatori distinti + un coach
-- + anon + service_role via `set_config('request.jwt.claims', …, true); set
-- local role …;` dentro una transazione con rollback finale (cleanup
-- verificato, 0 righe residue) — stesso metodo di test/security/workouts-self-kind.sql
-- (Onda 29.5). 11/11 scenari attesi confermati, incluso un bug scoperto e
-- corretto in corsa: `not (auth.uid() = p_swimmer or is_coach())` è NULL (non
-- TRUE) quando auth.uid() è NULL — un chiamante anon senza 'sub' nel JWT
-- bypassava il check. Fix: `(...) is not true` (NULL-safe). Dettagli in
-- STATO.md e SECURITY_AUDIT.md.
do $$
declare
  reserve_def text;
  link_def text;
  release_def text;
  grant_still_public boolean;
begin
  -- C-7: grant_monthly_tokens non più eseguibile da anon/authenticated
  -- (pensata per il solo cron, service_role/postgres non sono nel revoke).
  select exists (
    select 1 from information_schema.routine_privileges
    where routine_schema = 'public' and routine_name = 'grant_monthly_tokens'
      and grantee in ('anon', 'authenticated')
  ) into grant_still_public;
  if grant_still_public then
    raise exception 'C-7 FAIL: grant_monthly_tokens ancora eseguibile da anon/authenticated';
  end if;

  -- C-6: reserve_lesson_token — check NULL-safe (auth.uid()=p_swimmer OR
  -- is_coach()) IS NOT TRUE, mai un semplice NOT(...) (three-valued logic bug).
  select pg_get_functiondef(oid) into reserve_def
  from pg_proc where proname = 'reserve_lesson_token' and pronamespace = 'public'::regnamespace;
  if reserve_def is null
     or reserve_def not ilike '%auth.uid() = p_swimmer%'
     or reserve_def not ilike '%is_coach()%'
     or reserve_def not ilike '%is not true%'
     or reserve_def not ilike '%raise exception%'
  then
    raise exception 'C-6 FAIL: reserve_lesson_token senza check di ownership NULL-safe';
  end if;

  -- C-6: link_lesson_token — check di ownership sul TOKEN (swimmer_id),
  -- non sull'argomento nudo: qui l'EXISTS/WHERE è già NULL-safe di suo.
  select pg_get_functiondef(oid) into link_def
  from pg_proc where proname = 'link_lesson_token' and pronamespace = 'public'::regnamespace;
  if link_def is null
     or link_def not ilike '%swimmer_id = auth.uid()%'
     or link_def not ilike '%is_coach()%'
     or link_def not ilike '%raise exception%'
  then
    raise exception 'C-6 FAIL: link_lesson_token senza check di ownership';
  end if;

  -- C-6: release_lesson_token — stessa forma di link_lesson_token.
  select pg_get_functiondef(oid) into release_def
  from pg_proc where proname = 'release_lesson_token' and pronamespace = 'public'::regnamespace;
  if release_def is null
     or release_def not ilike '%swimmer_id = auth.uid()%'
     or release_def not ilike '%is_coach()%'
     or release_def not ilike '%raise exception%'
  then
    raise exception 'C-6 FAIL: release_lesson_token senza check di ownership';
  end if;

  raise notice 'C-6/C-7 OK: ownership check presente su reserve/link/release_lesson_token; grant_monthly_tokens non più pubblica';
end $$;
