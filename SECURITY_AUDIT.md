# SECURITY_AUDIT — GLIDE (S-0 orientamento)

**Eseguito:** 28 luglio 2026 · Claude Code (solo lettura, nessun fix)
**Progetto DB:** Supabase `unsdbeliaunhhgnuefyz` (region `eu-central-1` / Frankfurt)
**Runbook:** `PROMPT_CODE_SEC.md` (S-0)

> ⚠️ **Divergenza runbook ↔ realtà.** L'audit `GLIDE_SECURITY_AUDIT_v1.md` e il runbook
> sono stati scritti su un modello **inferito dai prototipi** (ledger vuoto, 11 tabelle a mano,
> `003_tenancy` con `coach_id`). Il repo reale è **molto più avanti**: 29 migration tracciate,
> role-lock già presente, bucket video già privato. Diverse voci "critiche" risultano **già chiuse**.
> Questo cambia il piano di S-1 (vedi §Riconciliazione).

---

## Risposte alle 7 domande di S-0

**1. Tabelle & RLS.** Tutte le tabelle di `public` hanno **RLS ATTIVA**. Nessuna tabella senza RLS.
Nessuna tabella con RLS attiva ma **zero policy**. → Copertura RLS (A-1 tecnico) **OK**.

**2. Policy su `profiles` + colonna `role`.**
- Policy UPDATE: `"profili: modifica propria o coach"` → `USING (id = auth.uid() OR is_coach())`,
  `WITH CHECK (id = auth.uid() OR is_coach())`. Un utente **può** fare UPDATE sulla propria riga.
- La policy **non** limita a livello di colonna `role`. **MA** esistono due trigger BEFORE UPDATE:
  - `protect_role_column` (migration_015): solleva eccezione se `role` cambia e l'attore non è coach/service_role.
  - `protect_tier_column` (migration_019): stessa protezione per `tier`.
- **Esito C-1:** l'escalation di ruolo è **già bloccata dal trigger** (`role` non auto-modificabile).
  Manca solo la "cintura" a livello di policy (column-level `with check`), oggi coperta dalle "bretelle" (trigger).

**3. Webhook Stripe** (`src/app/api/stripe/webhook/route.ts`): **esiste** e verifica la firma
correttamente → `await req.text()` (RAW body) + `stripe.webhooks.constructEvent(raw, sig, STRIPE_WEBHOOK_SECRET)`,
firma non valida → **400**. → **C-2 firma OK**. ❗ **Manca l'idempotenza**: nessuna tabella
`stripe_events`/dedup per `event.id`. Un retry di Stripe può ri-processare l'evento.

**4. Bucket video** (`race-videos`): **privato**. Accesso solo via `createSignedUrl`/`createSignedUrls`
(TTL 3600s = 1h). Nessun `getPublicUrl`. → **C-5 OK**.

**5. Variabili `NEXT_PUBLIC_`** (solo nomi): `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`.
Tutte **pubblicabili per design** (publishable/anon/url/name). **Nessun segreto** esposto. → **C-4 OK**.

**6. Security header** (`next.config.ts`): **assenti** — il file è vuoto (nessun header).
→ **A-7 APERTO** (CSP/HSTS/X-Content-Type-Options/Referrer-Policy/Permissions-Policy da aggiungere in S-2).

**7. Ledger migrazioni:** **tracciato e pieno** — `supabase/migrations/` contiene **29 migration
(001→029)**, applicate. Il ledger **NON è vuoto**: la premessa di M-1/S-0.5 non vale su questo repo.
Naming reale ≠ runbook (es. `001_activity_ledger` non `001_events`; `003_efficiency_window` non `003_tenancy`).

---

## Stato dei finding critici (riletti sul codice reale)

| Finding | Stato reale | Nota |
|---|---|---|
| **C-1** escalation ruolo | 🟡 **mitigato** | Trigger `protect_role_column` presente. Manca il column-check in policy (difesa in profondità). |
| **C-2** webhook Stripe firma | 🟢 **chiuso** (firma) / 🟡 idempotenza mancante | Verifica firma su raw body OK; manca dedup `stripe_events`. |
| **C-3** regione UE | 🟢 **OK** | `eu-central-1` (Frankfurt). |
| **C-4** service_role in client | 🟢 **OK** | Nessun segreto in `NEXT_PUBLIC_`. |
| **C-5** bucket video privato | 🟢 **OK** | Privato + signed URL 1h. |
| **A-1** copertura RLS | 🟢 **OK** | Tutte le tabelle: RLS + policy. |
| **A-7** security headers | 🔴 **aperto** | `next.config.ts` vuoto. |
| **A-2** cron protetti | 🟡 da verificare | `CRON_SECRET` già usato (es. `/api/cron/digest`); verificare tutte le route cron in S-4. |
| **idempotenza Stripe** | 🟡 aperto | tabella `stripe_events` da aggiungere. |

---

## Riconciliazione col runbook (impatto su S-0.5 / S-1)

1. **S-0.5 non applicabile come scritto.** Non c'è CLI Supabase in questo ambiente (`supabase db pull`
   impossibile) **e** il ledger è già tracciato (001→029): non c'è baseline da rifare.
2. **`coach_id` NON esiste su `profiles`.** Verificato via `information_schema`. Il repo usa il modello
   **coach-unico** (`is_coach()`, ADR-002), non multi-tenant. Non c'è `migration_003_tenancy`.
3. **Conseguenza su S-1 (role-lock):** la policy proposta nel runbook referenzia `coach_id` — quella riga
   va **omessa**. Il role-lock utile qui = policy `with check` che congela `role` (e `tier`) sul valore
   corrente, **sopra** il trigger già presente. Da decidere con Alessio prima di scrivere `migration_006`.
4. **`migration_004_consents` non esiste** in questo repo (il 004 è `backfill_ledger`). Vincolo ⛔ rispettato
   per costruzione: non c'è nulla da (non) applicare.

---

## Cosa NON ho toccato (vincoli ⛔ rispettati)
Nessun fix, nessuna migration applicata, nessun drop, nessuna modifica alla config Supabase,
nessun testo consenso/retention/DPIA, nessun vocabolario clinico. Solo lettura + questo file.
