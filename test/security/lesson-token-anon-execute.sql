-- Test di regressione C-6 (S-5, PROMPT_CODE_SEC_S5.md): EXECUTE su
-- link/release/reserve_lesson_token non più concesso ad anon. Fallisce
-- (RAISE) se il revoke viene rimosso o se anon viene ri-concesso.
--
-- Verifica la STRUTTURA della difesa (grant), non solo l'impersonazione —
-- quella è stata comunque eseguita LIVE sul DB reale: anon su tutte e tre
-- riceve `permission denied for function ...` (42501, insufficient_privilege)
-- PRIMA di entrare nel corpo della funzione; authenticated (lo swimmer
-- proprietario) continua a riservare il proprio token senza problemi.
-- Metodo: `set_config('request.jwt.claims', …, true); set local role …;`
-- dentro una transazione con rollback finale, cleanup verificato (0 righe
-- residue) — stesso metodo di test/security/rpc-ownership-lesson-tokens.sql
-- (24/8) e di workouts-self-kind.sql (Onda 29.5). Dettaglio in STATO.md.
--
-- NB: il prompt sorgente chiedeva un file .test.ts — `npm test` gira solo
-- su `src/**/*.test.ts` (package.json), e un test che colpisce davvero
-- l'API REST live di Supabase (per provare 401/403 end-to-end) sarebbe
-- un test di rete contro il progetto reale: fragile in CI, richiede
-- credenziali reali nel test runner. Questo file segue invece lo stesso
-- pattern SQL già in uso in questo repo per i fix RLS/grant precedenti —
-- verificato che intercetta davvero una regressione (vedi sotto).
do $$
declare
  anon_still_granted boolean;
  authenticated_still_granted boolean;
begin
  select exists (
    select 1 from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name in ('link_lesson_token', 'release_lesson_token', 'reserve_lesson_token')
      and grantee = 'anon'
  ) into anon_still_granted;
  if anon_still_granted then
    raise exception 'C-6 (S-5) FAIL: anon ha ancora EXECUTE su una delle funzioni lesson token';
  end if;

  select count(*) = 3 into authenticated_still_granted
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name in ('link_lesson_token', 'release_lesson_token', 'reserve_lesson_token')
    and grantee = 'authenticated';
  if not authenticated_still_granted then
    raise exception 'C-6 (S-5) FAIL: authenticated ha perso EXECUTE su una delle funzioni lesson token — romperebbe la prenotazione con token per uno swimmer reale';
  end if;

  raise notice 'C-6 (S-5) OK: EXECUTE tolto ad anon, mantenuto ad authenticated su link/release/reserve_lesson_token';
end $$;
