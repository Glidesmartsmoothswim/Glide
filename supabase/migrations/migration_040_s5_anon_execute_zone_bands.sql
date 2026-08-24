-- ============================================================
-- GLIDE — migration_040_s5_anon_execute_zone_bands.sql
-- PROMPT_CODE_SEC_S5.md, GLIDE_SECURITY_AUDIT_v2.md §3: C-6, C-7.
-- Basso rischio, nessuna decisione nuova — solo superficie d'attacco
-- inutile chiusa, verificata via query dirette (non ipotesi):
--   information_schema.routine_privileges → anon+authenticated su
--   link/release/reserve_lesson_token; pg_policy → bands_read senza
--   restrizione di ruolo (polroles = {-} = PUBLIC).
-- ============================================================

-- --- FIX C-6 — EXECUTE su token RPC ancora aperto ad anon --------------------
-- migration_039 (23/8) ha già chiuso l'IDOR: ogni funzione verifica ownership
-- e un anon riceve 'not authorized'. Ma restano chiamabili PRIMA ancora di
-- arrivare al check, da chi non è nemmeno autenticato — nessun caso d'uso
-- legittimo pre-login le richiede (riscattare/collegare/rilasciare un token
-- lezione 1:1 presuppone per forza un account). authenticated NON va
-- toccato: gli swimmer autenticati devono continuare a chiamarle (via
-- src/app/api/booking/create/route.ts, percorso service_role, e in
-- prospettiva anche via client diretto se mai servisse).
revoke execute on function public.link_lesson_token(uuid, uuid)    from anon;
revoke execute on function public.release_lesson_token(uuid)       from anon;
revoke execute on function public.reserve_lesson_token(uuid)       from anon;

-- --- FIX C-7 — zone_rpe_bands leggibile anche da anon ------------------------
-- La mappatura Z1-Z5/RPE del protocollo è metodologia interna (volutamente
-- non esposta nel copy customer-facing), non contenuto pubblico: restringere
-- la SOLA lettura ad authenticated. bands_write resta invariata (già
-- scoping is_coach(), sia per anon sia per authenticated non-coach).
drop policy if exists bands_read on public.zone_rpe_bands;

create policy bands_read on public.zone_rpe_bands
  for select
  to authenticated
  using (true);
