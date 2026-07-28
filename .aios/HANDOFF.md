# Handoff — 28 luglio 2026

## Sessione appena chiusa
- **Task:** audit sicurezza & privacy dell'architettura GLIDE + preparazione runbook eseguibile per Code.
- **Stato:** completato a livello di **spec**. Esecuzione sul codice NON ancora iniziata.
- **File prodotti / toccati:**
  - `GLIDE_SECURITY_AUDIT_v1.md` (audit consolidato, con severità e split ora/build/continuativo)
  - `PROMPT_CODE_SEC.md` **v2** (runbook Code: ⛔ vincoli · S-0 · **S-0.5** · S-1 · S-2 · S-3 · **S-4**)
  - `CURRENT_STATE.md` (aggiornato)
- **Decisioni prese:** nessun ADR ancora scritto. Proposta bozza **ADR — Security Baseline Step 1** (vedi Note): in attesa di OK esplicito prima di scriverla in `architecture/DECISIONS/` (AIOS §2).

## Prossimo passo
- **Task:** eseguire il runbook con Claude Code, in ordine: **S-0 → S-0.5 (STOP) → S-1 → S-2 → S-3 → S-4**.
- **Contesto necessario per Code:** `PROMPT_CODE_SEC.md` (primario) · `GLIDE_PRIVACY_SECURITY_REVIEW.md` (razionale) · `GLIDE_ADR.md` (ADR-004 router, ADR-009 tenancy, ADR-003 ledger) · `GLIDE_MASTERPLAN_2036.md` §11 (migration 003/004/005).
- **Blocchi da risolvere PRIMA:**
  1. Confermare che le migration `001_events`, `002_readiness_v2`, `003_tenancy` esistano nel repo (le applica S-0.5).
  2. ~~Recuperare da ADR-004 la lista red-flag~~ **RISOLTO:** ADR-004 contiene già L1/L2 e il router è già implementato come funzione pura (Sprint 9). S-4 è quindi *solo enforcement*: server-side, non aggirabile, nessuna identità verso l'LLM. Code non inventa nulla.

## Hard stops (non superare senza OK di Alessio)
1. Dopo **S-0.5**: verificare "nessun conflitto" + `coach_id` presente prima di S-1.
2. `migration_004_consents`: **NON** applicare finché DPIA + testi consenso non sono pronti.
3. Migrazione regione Supabase (se fuori UE): azione manuale di Alessio, non di Code.

## Note libere
- Bozza ADR proposta da formalizzare come **ADR-006 — "Security Baseline Step 1"** (006 risulta libero: 001–005 occupati, 007–011 riservati ma non formalizzati). Decisioni: (a) role-lock via policy `with check` + trigger `protect_role_column`; (b) webhook Stripe con verifica firma su raw body + idempotenza `stripe_events`; (c) sequenza `db pull` baseline prima di ogni nuova migration; (d) enforcement server-side dell'health router con minimizzazione verso LLM (subject_id pseudonimo, red-flag a template fisso).
- Test manuale da non saltare: da account nuotatore reale, `update profiles set role='coach'` **deve fallire**.
- Verifica post-CSP: il checkout Stripe deve continuare a funzionare (la CSP è ciò che più spesso rompe i pagamenti).
