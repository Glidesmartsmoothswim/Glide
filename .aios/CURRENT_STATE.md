# CURRENT_STATE — GLIDE

**Aggiornato:** 28 luglio 2026
**Compliance AIOS:** Level 1 (PROJECT · CURRENT_STATE · MEMORY · HANDOFF)

---

## Milestone corrente
**Sicurezza & Privacy — Step 1** (hardening prima del primo utente pagante).

## Completato
- Audit consolidato sicurezza + privacy → `GLIDE_SECURITY_AUDIT_v1.md`
- Riconciliato con la revisione esistente → `GLIDE_PRIVACY_SECURITY_REVIEW.md`
- Runbook eseguibile per Code, **v2** → `PROMPT_CODE_SEC.md`
  (aggiunti **S-0.5** baseline migrazioni e **S-4** cron + enforcement health router)
- **S-0 eseguito sul codice reale** (28 lug) → `SECURITY_AUDIT.md`. Emersa divergenza:
  il repo è molto più avanti del modello inferito nell'audit (ledger tracciato 001→029,
  role-lock già presente via trigger, bucket video già privato, no segreti in NEXT_PUBLIC_).

## In sviluppo
- **Runbook S-0 → S-4 COMPLETATO** (PR `claude/security-baseline-s0`). Fix di codice
  applicati + test (`npm test`, 26 verdi). Migration 030/031 applicate. ADR-006 accepted.
- Restano i **gate umani** (non codice): test manuale role-escalation, env Upstash su
  Vercel, promozione CSP a enforcing, MFA/leaked-password/backup, scansione git history,
  bump `next@16.2.12`, limiti upload video (M-6).

## Problemi aperti / blocchi
- **Divergenza runbook↔repo:** il runbook assume "ledger vuoto + `003_tenancy` con `coach_id`".
  Nel repo reale il ledger è tracciato (001→029) e **`coach_id` NON esiste su `profiles`**
  (il modello è coach-unico via `is_coach()`, ADR-002 — non multi-tenant).
- **`supabase db pull`** non eseguibile in questo ambiente (nessun CLI Supabase).
- **`migration_004_consents`** non esiste in questo repo (il 004 è `backfill_ledger`).
- **C-3 regione Supabase** = `eu-central-1` (Frankfurt) — già UE (confermato in sessioni precedenti).

## Prossimo task
Decidere con Alessio come riorientare **S-1** dato che `coach_id` non esiste:
role-lock policy `with check` senza la riga `coach_id`, sopra il trigger già presente.

## Binario umano (parallelo, non Code)
Regione UE (ok) · MFA coach · leaked-password · backup PITR + restore provato · DPIA + testi consenso.
