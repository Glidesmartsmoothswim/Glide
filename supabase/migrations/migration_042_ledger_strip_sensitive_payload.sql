-- ============================================================
-- GLIDE — migration_042_ledger_strip_sensitive_payload.sql
-- APPLICATA su Supabase (progetto unsdbeliaunhhgnuefyz) il 26/08/2026.
--
-- PROMPT_CODE_READINESS_V3_1.md §1bis — leak retroattivo scoperto durante
-- l'ADR-013 (migration_041, ancora NON applicata): `migration_004_backfill_ledger.sql`
-- (già applicata il 15/7) scriveva `corpo` e `health_flag` nel payload di
-- `activity_events` per gli eventi `readiness.pre`. `activity_events` è a
-- conservazione ILLIMITATA (GLIDE_REGISTRO_TRATTAMENTI §10) — dato sanitario
-- che non deve stare in una tabella così.
--
-- Verificato dal vivo PRIMA dell'apply: 22 righe coinvolte, dal 12/07 al
-- 25/08 (il giorno prima — leak ancora ATTIVO, non solo storico), utenti
-- attivi inclusi (non solo tester in cancellazione). Verificato DOPO
-- l'apply: 0 righe rimaste con `corpo`/`health_flag` nel payload.
--
-- Applicata PRIMA di migration_041 in ordine di esecuzione (come richiesto
-- dal prompt sorgente, "priorità sopra la §2"), pur avendo un numero di
-- sequenza successivo nel ledger del repo: nessun prerequisito la blocca
-- (a differenza del DROP COLUMN di migration_041, che aspetta pulizia dati
-- tester + ADR-013 ACCETTATO), tratta dati reali già impropriamente
-- conservati, e non richiede nessuna delle due condizioni.
--
-- Nota: questo fix da solo non basta — se il codice applicativo continua a
-- scrivere `corpo`/`health_flag` nel payload a ogni check-in, il leak si
-- riapre da solo. Il fix del path live è già in `src/app/app/readiness-actions.ts`
-- (parte del lavoro ADR-013, migration_041 + PR collegata): il payload di
-- `readiness.pre` non contiene più quelle chiavi. Non è ancora in produzione
-- finché quella PR non è mersata — la correzione qui sotto vale solo per le
-- righe già scritte, non impedisce nuove scritture finché il codice non è
-- deployato.
-- ============================================================

begin;

update public.activity_events
set payload = payload - 'corpo' - 'health_flag'
where payload ? 'corpo' or payload ? 'health_flag';

commit;

-- Verifica post-apply: select count(*) from activity_events
-- where payload ? 'corpo' or payload ? 'health_flag'; -- deve dare 0.
