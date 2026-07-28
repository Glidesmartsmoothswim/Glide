# ADR-006 — Security Baseline Step 1

**Data:** 28 luglio 2026
**Stato:** accepted
**Relazione:** consolida i fix di `GLIDE_PRIVACY_SECURITY_REVIEW.md`. Coerente con ADR-003 (ledger) e ADR-004 (router). ⚠️ Verificare che non si sovrapponga a **ADR-002** (contenuto non riletto al momento della stesura).

---

## Contesto
Audit pre-primo-utente-pagante. GLIDE tratta dati sanitari (art. 9 GDPR) su base sistematica. L'audit ha rilevato tre vulnerabilità critiche (escalation ruolo, webhook Stripe non firmato, regione Supabase non confermata UE) e un ledger migrazioni vuoto (11 tabelle create a mano). Serve una baseline di sicurezza minima, testabile, prima di accettare il primo pagamento o dato reale.

> **Nota di esecuzione (S-0, 28 lug).** Alla verifica sul repo reale lo stato era più avanti del modello inferito dall'audit: ledger già tracciato (001→029), regione già UE (`eu-central-1`), bucket video già privato, firma webhook già presente, role-lock già mitigato da trigger. `coach_id` **non esiste** su `profiles` (modello coach-unico via `is_coach()`, non multi-tenant): la riga `coach_id` di D1 è stata **omessa**. `migration_004_consents` non esiste in questo repo. Le decisioni sotto restano valide; la loro implementazione è documentata in `SECURITY_AUDIT.md` e `STATO.md`.

---

## Decisioni

### D1 — Protezione della colonna `role` (cintura + bretelle)
**Alternative:**
- *(a) Solo policy RLS `with check`* — pro: semplice; contro: se una policy futura viene riscritta male, la protezione salta.
- *(b) Solo trigger* — pro: robusto lato DB; contro: non esprime l'intento a livello di policy.
- *(c) Entrambi* ✅ — pro: doppia difesa indipendente; contro: due punti da mantenere.

**Scelto (c):** policy `profiles_self_update` con `with check` che blocca il cambio di `role`/`coach_id`, **più** trigger `protect_role_column` che solleva eccezione se `role` cambia e l'attore non è `service_role`.
*Implementazione (S-1):* trigger già presente (migration_015); aggiunta la policy che congela `role` nel ramo self (`migration_030`). `coach_id` omesso (assente). `tier` resta protetto dal suo trigger dedicato (migration_019).

### D2 — Webhook Stripe: firma + idempotenza
Verifica obbligatoria di `stripe-signature` con `constructEvent` sul **raw body**; deduplicazione via tabella `stripe_events` (PK = `event.id`). L'entitlement deriva **solo** dagli eventi Stripe, mai da input client.
*Alternativa scartata:* fidarsi dell'IP sorgente Stripe — fragile e aggirabile.
*Implementazione (S-1):* firma già presente; aggiunta idempotenza `stripe_events` + dedup nel webhook (`migration_031`).

### D3 — Baseline prima di ogni nuova migration
**Alternative:**
- *(a) Applicare la nuova migration sul DB non tracciato* — pro: veloce; contro: drift, role-lock potenzialmente monco (manca `coach_id` da `003_tenancy`).
- *(b) `supabase db pull` → baseline → applicare 001→003 → poi le nuove* ✅ — pro: ledger allineato alla realtà, riproducibilità; contro: uno step in più.

**Scelto (b).** Regola permanente: **nessuna nuova migration senza baseline tracciata**.
*Nota (S-0.5):* nel repo reale il ledger è già tracciato (001→031): la baseline non serviva; la regola resta valida per il futuro.

### D4 — Enforcement server-side del router sanitario (estende ADR-004)
Il matcher deterministico gira **server-side** e **prima** di ogni chiamata LLM; nessun percorso può saltarlo. Red-flag (L2) → template fisso, LLM mai chiamato. Verso l'LLM parte **solo** un `subject_id` pseudonimo: mai nome, email, data di nascita. ADR-004 resta la fonte del vocabolario clinico; qui se ne rende **non aggirabile** la struttura.
*Implementazione (S-4):* verificato non aggirabile (`classify` prima di `callModel`, unico entry point `/api/assistant`); verso l'LLM va solo il messaggio (mai il nome). Test `safety.test.ts`.

### D5 — Endpoint cron autenticati
Ogni route chiamata dai cron Vercel verifica `Authorization: Bearer ${CRON_SECRET}`; header assente/errato → 401, nessun side effect.
*Implementazione (S-4):* helper `cronAuthorized` **fail-closed** (nega anche se `CRON_SECRET` non è impostato) su digest e video-purge. Test `cron-auth.test.ts`.

### D6 — Cancellazione senza rompere il ledger (rinvio)
La tensione art. 17 ↔ ledger append-only si risolve per **pseudonimizzazione** (distruzione della mappa identità↔soggetto), come da review §7.6. La funzione `forget_subject` **non** rientra in questa baseline: dipende dallo schema dei consensi (`004_consents`), gated su DPIA. Tracciata qui, decisa altrove.

---

## Conseguenze
- Ogni fix ha un test che fallisce se il fix viene rimosso (non-regressione). Suite eseguibile via `npm test` (aggiunto runner `tsx` in S-4).
- Il binario "codice" (Code) è separato dal binario "umano/legale" (regione UE, MFA, backup, DPIA, testi consenso): quest'ultimo non è coperto da questo ADR.
- `004_consents` resta bloccante fino a DPIA + testi consenso.
- **Aggiunta in esecuzione:** regola email "notifica, non contiene" applicata al digest coach; rate limiting (Upstash) su AI e auth; security headers (CSP in Report-Only, da promuovere a enforcing).

## Link
- Runbook esecutivo: `PROMPT_CODE_SEC.md` (v2 — S-0 … S-4)
- Razionale esteso: `GLIDE_PRIVACY_SECURITY_REVIEW.md`
- Audit consolidato: `GLIDE_SECURITY_AUDIT_v1.md` · esito esecuzione: `SECURITY_AUDIT.md`
- Migration: `030_role_lock`, `031_stripe_events` (in questo repo; il runbook citava `006_role_lock`), `015_role_lock` (trigger, dipendenza)
- ADR collegati: ADR-003 (ledger), ADR-004 (router), ADR-009 (tenancy, non ancora formalizzato)
