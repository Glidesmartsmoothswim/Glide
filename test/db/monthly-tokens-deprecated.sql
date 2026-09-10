-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- Test di regressione M4/M5 (GLIDE_DB_CHANGES_001 / migration_056).
-- Fallisce (RAISE) se la maturazione automatica dei token torna in vita.
--
-- Decisione: un token si compra (pacchetti, ADR-016) o lo regala il coach
-- (ADR-015). Non matura per il solo fatto di avere un abbonamento attivo.
do $$
declare
  fn_exists boolean;
  job_exists boolean;
  spendibili int;
begin
  select exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'grant_monthly_tokens'
  ) into fn_exists;
  if fn_exists then
    raise exception 'M4 FAIL: public.grant_monthly_tokens() esiste ancora';
  end if;

  -- pg_cron non è installato su questo progetto: il check serve per gli
  -- ambienti in cui lo `cron.schedule` di migration_024 era stato eseguito.
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $q$ select exists (select 1 from cron.job where jobname = 'grant-monthly-tokens') $q$
      into job_exists;
    if job_exists then
      raise exception 'M4 FAIL: il job grant-monthly-tokens è ancora schedulato';
    end if;
  end if;

  -- M5: nessun token 'mensile' spendibile. Quelli già riscattati restano:
  -- sono storia legata a una prenotazione, se ne vanno con la pulizia dei
  -- dati dei tester.
  select count(*) into spendibili
  from public.lesson_tokens
  where source = 'mensile' and redeemed_at is null;
  if spendibili > 0 then
    raise exception 'M5 FAIL: % token mensili ancora spendibili', spendibili;
  end if;

  raise notice 'M4/M5 OK: nessuna maturazione automatica, nessun token mensile spendibile';
end $$;
