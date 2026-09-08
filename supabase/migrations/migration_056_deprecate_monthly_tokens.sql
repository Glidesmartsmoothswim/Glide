-- ============================================================
-- GLIDE — migration_056_deprecate_monthly_tokens.sql
-- (GLIDE_DB_CHANGES_001, blocchi M4 + M5 — i token non maturano più
--  con l'abbonamento)
--
-- Decisione presa: un token lezione si compra (pacchetti, ADR-016) o lo
-- regala il coach (ADR-015), e vale anche col piano Base gratuito. Non
-- matura da solo per il fatto di avere un abbonamento attivo.
--
-- `grant_monthly_tokens()` (migration_024, riagganciata al servizio 1:1 da
-- migration_027) fa esattamente l'opposto: emette un token 'mensile' a ogni
-- profilo con service_type in ('coaching_1_1','both') o tier 'one_to_one'.
--
-- Verifica dei chiamanti PRIMA del drop, tutti esclusi:
--  - pg_cron NON è installato sul progetto (lo `cron.schedule` in coda a
--    migration_024 non è mai stato eseguito lì): nessuno scheduler in DB;
--  - EXECUTE risulta concesso ai soli postgres/service_role (migration_039,
--    fix C-7): nessun client autenticato può invocarla via /rest/v1/rpc;
--  - nessun workflow GitHub Actions nel repo (.github contiene solo
--    dependabot.yml), nessun cron di Vercel che la chiami (vercel.json:
--    /api/cron/digest e /api/cron/video-purge, nessuna delle due la usa);
--  - l'unica Edge Function attiva (`send-payment-email`) non la nomina;
--  - `grep -rn grant_monthly_tokens` nel repo: solo migration passate,
--    documentazione e test di regressione.
--
-- Il gemello applicativo se ne va con lo stesso commit: `lib/entitlements.ts`
-- (`grantMonthlyTokenIfMissing`, chiamata da coach/nuotatori/actions.ts e
-- lib/coach/create-swimmer.ts) accreditava un token 'mensile' via client
-- admin all'assegnazione del servizio 1:1 — stessa maturazione automatica,
-- percorso diverso. Droppare la funzione senza togliere quella sarebbe
-- servito a poco.
--
-- APPLICATA sul progetto live l'08/09/2026 (MCP, `056_deprecate_monthly_tokens`):
-- funzione assente, 6 token cancellati, `mensile` con 0 non usati e 1 totale.
-- ============================================================

-- --- M4: via la funzione -----------------------------------------------------

-- Difesa per gli ambienti dove il `cron.schedule` di migration_024 era stato
-- eseguito davvero: un job che chiama una funzione inesistente fallirebbe a
-- ogni primo del mese. Qui pg_cron non c'è e il blocco non fa nulla.
-- I riferimenti a cron.* sono in SQL dinamico di proposito: PL/pgSQL
-- pianifica l'espressione INTERA, quindi un `cron.job` inesistente fa
-- fallire il blocco anche quando il ramo non viene eseguito (verificato:
-- 42P01 al primo tentativo di apply su questo progetto, dove pg_cron non c'è).
do $$
declare job_presente boolean;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $q$ select exists (select 1 from cron.job where jobname = 'grant-monthly-tokens') $q$
      into job_presente;
    if job_presente then
      execute $q$ select cron.unschedule('grant-monthly-tokens') $q$;
    end if;
  end if;
end $$;

drop function if exists public.grant_monthly_tokens();

-- --- M5: i token residui della fase di test ---------------------------------
--
-- 7 token con origine 'mensile' sul progetto live, tutti per lezioni singole,
-- emessi dalla vecchia logica. I 6 non riscattati sono spendibili: chi li ha
-- potrebbe prenotare una lezione gratis a cui non ha più diritto. Vanno via.
--
-- Il settimo, già riscattato, NON si tocca qui: è storia legata a una
-- prenotazione (`lesson_tokens.redeemed_booking_id`), e se ne va insieme al
-- resto dei dati dei tester nella pulizia già in programma. Per questo il
-- filtro è su `redeemed_at is null` e non sulla sola origine.

delete from public.lesson_tokens
 where source = 'mensile'
   and redeemed_at is null;

-- 'mensile' resta un valore ammesso da `lesson_tokens_source_check` proprio
-- per quella riga storica: toglierlo dal CHECK la renderebbe non aggiornabile.
-- Nessuna origine nuova la produce più.
