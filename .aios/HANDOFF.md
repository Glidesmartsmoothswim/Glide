# Handoff — Gestionale GLIDE · 28 luglio 2026 (sera)

## Sessione appena chiusa
- **Task:** Security Baseline Step 1 — esecuzione del runbook `PROMPT_CODE_SEC.md` (S-0 → S-4) su Claude Code.
- **Stato:** ✅ **completato e mergiato** (PR #21 → `main`). Migration 030/031 applicate al DB di produzione. 26 test verdi (`npm test`).
- **Scoperta chiave:** il repo reale era molto più avanti del modello dell'audit. Già a posto prima di iniziare: regione UE (`eu-central-1`), bucket video privato, firma webhook, ledger tracciato (001→029), role-lock via trigger. **`coach_id` NON esiste su `profiles`** (modello coach-unico `is_coach()`, non multi-tenant) → riga `coach_id` di D1 omessa. `migration_004_consents` non esiste in questo repo (il 004 è `backfill_ledger`).

### File toccati (in `main`)
- **DB:** `migration_030_role_lock.sql`, `migration_031_stripe_events.sql` (applicate).
- **Codice:** `next.config.ts` (headers + CSP Report-Only), `src/app/api/stripe/webhook/route.ts` (idempotenza), `src/app/api/cron/{digest,video-purge}/route.ts` (`cronAuthorized`), `src/lib/cron-auth.ts` (nuovo), `src/lib/ratelimit.ts` (nuovo, Upstash), `src/app/api/assistant/route.ts` + `src/app/login/actions.ts` (rate limit), `src/app/api/cron/digest/route.ts` (digest email → notifica).
- **Test:** `src/lib/cron-auth.test.ts`, `src/lib/assistant/safety.test.ts`; runner `tsx` + script `npm test`; deps `@upstash/ratelimit`, `@upstash/redis`, `tsx`.
- **Script:** `scripts/rls-audit.sql`, `scripts/check-secrets.sh`; `test/security/{role-lock,stripe-idempotency}.sql`.
- **Doc:** `SECURITY_AUDIT.md` (S-0 + stato finale finding), setup `.aios/` (PROJECT/CURRENT_STATE/MEMORY/HANDOFF), `PROMPT_CODE_SEC.md`, `GLIDE_SECURITY_AUDIT_v1.md`, **ADR-006** (accepted), `AIOS.md` (root, PR #20).

### Decisioni prese
- **ADR-006 — Security Baseline Step 1** (accepted): D1 role-lock cintura+bretelle (policy congela `role` + trigger), D2 webhook firma+idempotenza, D3 baseline prima di nuove migration, D4 enforcement router server-side, D5 cron autenticati fail-closed, D6 forget_subject rinviato (dipende da consensi/DPIA).
- CSP in **Report-Only** (non enforcing) per non rischiare i pagamenti Stripe live.
- Digest coach → **notifica** (niente dati sanitari in email).
- Rate limiting via **Upstash** (no-op finché non si impostano le env).

## Prossimo passo
- **Gate umani (non codice), da chiudere prima del primo utente pagante reale:**
  1. Test manuale role-escalation: da account nuotatore, `update profiles set role='coach'` **deve fallire**.
  2. Impostare `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` su Vercel (senza, rate limit no-op).
  3. Promuovere la **CSP** a enforcing dopo aver verificato i report di violazione + checkout Stripe sulla preview.
  4. MFA account coach · leaked-password protection (Pro) · backup PITR + restore di prova.
  5. Scansione git history (`gitleaks`/`trufflehog`) + rotazione chiavi se mai esposte.
  6. Bump `next@16.2.12` (chiude i 12 HIGH `postcss`/`sharp`) — a parte e verificato (Next modificato, vedi `AGENTS.md`).
- **Codice aperto (build items 🟡):** M-6 limiti upload video (MIME/dimensione/durata), M-5 audit validazione input dei form.
- **Step 2 (binario legale, NON Code):** `migration_004_consents` + architettura consensi (Art. 9), informativa, DPA, **DPIA**, retention/oblio. Bloccante fino a testi legali. Code lo tocca solo quando Alessio lo sblocca.

## Blocchi
- `004_consents` bloccato su DPIA + testi consenso (decisione legale, non tecnica).
- Rate limit e CSP-enforcing dipendono da azioni umane (env Upstash, verifica preview) prima di essere pienamente attivi.
- Infra: 3 progetti Vercel **duplicati** (`glide-cufw/n36e/suhv`) senza env falliscono i check su ogni PR — rumore, non codice. Da eliminare su Vercel.

## Note libere
- `npm test` ora esiste (prima i test c'erano ma non giravano: import senza estensione → serve `tsx`).
- La riga `coach_id` nel role-lock è stata omessa apposta: se un giorno si va multi-tenant, va introdotta `003_tenancy` + reintrodotto `coach_id` nella policy.
