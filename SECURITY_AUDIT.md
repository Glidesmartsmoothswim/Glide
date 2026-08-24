# SECURITY_AUDIT — GLIDE

> Log cronologico, voce più recente in cima. Non sovrascrivere le sezioni precedenti: sono lo
> storico dei finding già chiusi nei cicli S-0→S-4 di fine luglio 2026.

---

## C-6 / C-7 — RPC lesson token (IDOR) + grant_monthly_tokens pubblica — 23 agosto 2026 (modalità autonoma)

> Seguito diretto della voce "Extra" dell'indagine S-0 (bis) del 21 agosto (sotto): quel giro
> aveva trovato 7 funzioni `SECURITY DEFINER` chiamabili via `/rest/v1/rpc/...` da anon/authenticated,
> segnalando `grant_monthly_tokens`/`reserve_lesson_token`/`release_lesson_token`/`link_lesson_token`
> come "corpo non verificato in questo giro". Verificato ora, con fix.

### C-6 — IDOR su RPC lesson token — nessun controllo ownership

**Problema:** nessuna delle tre funzioni verificava che il token/swimmer passato come argomento
appartenesse al chiamante. Un utente `authenticated` qualsiasi poteva chiamare
`/rest/v1/rpc/reserve_lesson_token` con `p_swimmer` di un altro nuotatore (o `link_lesson_token`/
`release_lesson_token` con l'`id` del token altrui) e operarci sopra — riservare/collegare/rilasciare
un token lezione 1:1 non suo.

**Fix (`migration_039_rpc_ownership_checks.sql`):** aggiunto in ciascuna, prima di qualunque update,
un controllo `auth.uid() = <proprietario> OR is_coach()` (stessa regola già in vigore nello schema —
non decisa in questa sessione), con `raise exception` esplicito (mai un update silenzioso a 0 righe).
Esentato il solo `auth.role() = 'service_role'`: è il percorso interno reale
(`src/app/api/booking/create/route.ts` chiama tutte e tre via `admin.rpc(...)`, service_role, con
l'id del nuotatore già autenticato a monte nella route) — senza l'esenzione il fix avrebbe rotto la
prenotazione con token in produzione.

**Bug scoperto e corretto in corsa durante il test live:** la forma naturale
`not (auth.uid() = p_swimmer or is_coach())` in `reserve_lesson_token` è **NULL, non TRUE**, quando
`auth.uid()` è NULL (chiamante `anon`, nessun `sub` nel JWT) — logica a tre valori SQL:
`NULL or false = NULL`, `not NULL = NULL`, e `if NULL then` non entra mai nel ramo. Con quella forma
un `anon` **senza alcuna identità** avrebbe bypassato silenziosamente il controllo (non essendo mai
`= p_swimmer` per costruzione, ma nemmeno mai bloccato). Corretto con `(...) IS NOT TRUE`
(NULL-safe: vale true sia per `false` sia per `NULL`). `link_lesson_token`/`release_lesson_token`
non avevano lo stesso bug: il loro check passa da un `EXISTS(... WHERE swimmer_id = auth.uid() ...)`,
e in un `WHERE` una riga con `NULL = NULL` è comunque esclusa (non "indecisa") — `EXISTS` ritorna
sempre un booleano definito, mai NULL.

**Verifica — LIVE sul DB reale**, impersonando due nuotatori distinti (id reali, esistenti) + un
coach + `anon` + `service_role` via `set_config('request.jwt.claims', …, true); set local role …;`
dentro una transazione con rollback finale (stesso metodo di Onda 29.5, `STATO.md`):

| # | Scenario | Atteso | Esito |
|---|---|---|---|
| S1 | B chiama `reserve_lesson_token(p_swimmer=A)` | errore 42501 | ✅ |
| S2 | A riserva il proprio token | riuscito | ✅ |
| S3 | Coach riserva un token per conto di B | riuscito (regola schema) | ✅ |
| S4 | B chiama `link_lesson_token` sul token di A | errore 42501 | ✅ |
| S5 | A collega il proprio token | riuscito | ✅ |
| S6 | B chiama `release_lesson_token` sul token di A | errore 42501 | ✅ |
| S7 | B rilascia il proprio token | riuscito | ✅ |
| S8 | `service_role` riserva per conto di B (percorso `/api/booking/create`) | riuscito, non esentato dal check | ✅ |
| S9 | `anon` (nessun `sub`) chiama `reserve_lesson_token` | errore 42501 | ✅ (bug NULL-safety trovato e corretto qui) |
| S10 | `authenticated` chiama `grant_monthly_tokens` | `permission denied` (42501) | ✅ |
| S11 | `anon` chiama `grant_monthly_tokens` | `permission denied` (42501) | ✅ |

**11/11 come atteso.** Cleanup verificato: `rollback` + conteggio righe di test residue = 0.
Test strutturale di regressione: `test/security/rpc-ownership-lesson-tokens.sql` (verifica che il
check ownership + `IS NOT TRUE` + `raise exception` siano nel corpo delle funzioni, e che il grant
resti tolto — stesso stile di `role-lock.sql`/`workouts-self-kind.sql`; verificato che fallisce
davvero se il fix viene rimosso, non solo che passa oggi).

### C-7 — grant_monthly_tokens() chiamabile pubblicamente

**Problema:** `SECURITY DEFINER` pensata per il solo cron (`pg_cron`, ruolo `postgres`), ma con
`EXECUTE` ancora concesso a `anon`/`authenticated` — verificato live su
`information_schema.routine_privileges`, nonostante il `revoke execute ... from public` già presente
in `migration_024`/`migration_027` (quel revoke toglie il grant implicito a `PUBLIC`, ma
`anon`/`authenticated` avevano un grant esplicito separato, non coperto).

**Fix:** `revoke execute on function public.grant_monthly_tokens() from anon, authenticated;`.
`service_role`/`postgres` non sono soggetti al revoke: il cron (`select cron.schedule(...)`,
`migration_024`/`027`) continua a funzionare invariato — non ri-verificato via impersonazione `postgres`
in questo giro (il ruolo `postgres` non è mai stato nel revoke, quindi non c'è nulla da regredire lì),
ma confermato che il grant a `postgres`/`service_role` resta intatto (vedi tabella grant sopra).

**Non toccato:** `is_coach`, `my_tier`, `test_mode` — restano chiamabili da anon/authenticated per
design (il client legge il proprio stato), come già annotato nell'indagine del 21 agosto sotto.

---

## Indagine mirata — 21 agosto 2026 (modalità autonoma, solo lettura)

> Richiesta: elenco completo migration + verifica applicata/non applicata sul DB live per
> ciascuna, approfondimento su `migration_023_pricing_cron` (contenuto, riferimenti nel codice,
> modalità di fallimento, log), schema esatto live delle 2 tabelle `marketing.*` non tracciate.
> **Nessuna modifica al DB.** Nessun `supabase db pull`, nessuna migration applicata: solo
> `execute_sql`/`list_migrations`/`query_logs` in lettura + lettura file locali. Fermato in attesa
> di OK prima di qualunque fix.

### 1. Tutte le migration in `supabase/migrations/`, in ordine

| # | File |
|---|---|
| 001 | `migration_001_activity_ledger.sql` |
| 002 | `migration_002_readiness_v2.sql` |
| 003 | `migration_003_efficiency_window.sql` |
| 004 | `migration_004_backfill_ledger.sql` |
| 005 | `migration_005_booking.sql` |
| 006 | `migration_006_videoanalisi.sql` |
| 007 | `migration_007_glide_scores.sql` |
| 008 | `migration_008_badges.sql` |
| 009 | `migration_009_security_hardening.sql` |
| 010 | `migration_010_fk_indexes.sql` |
| 011 | `migration_011_cash_payments.sql` |
| 012 | `migration_012_revoke_public_execute.sql` |
| 013 | `migration_013_swimmer_profile.sql` |
| 014 | `migration_014_workout_published_backfill.sql` |
| 015 | `migration_015_role_lock.sql` |
| 016 | `migration_016_intake.sql` |
| 017 | `migration_017_video_retention.sql` |
| 018 | `migration_018_programs.sql` |
| 019 | `migration_019_tiers_open_week.sql` |
| 020 | `migration_020_library.sql` |
| 021 | `migration_021_objectives.sql` |
| 022 | `migration_022_medical_certificates.sql` |
| 023 | `migration_023_pricing_cron.sql` |
| 024 | `migration_024_lesson_tokens.sql` |
| 025 | `migration_025_perf_indexes_rls.sql` |
| 026 | `migration_026_lesson_buffer_zero.sql` |
| 027 | `migration_027_test_mode_and_11_perks.sql` |
| 028 | `migration_028_booking_token_and_step15.sql` |
| 029 | `migration_029_booking_pending.sql` |
| 030 | `migration_030_role_lock.sql` |
| 031 | `migration_031_stripe_events.sql` |
| 032 | `migration_032_medcert_no_file.sql` |
| 033 | `migration_033_readiness_note_coach.sql` |
| 034 | `migration_034_weekly_feedback.sql` |

Tutte in `supabase/migrations/` (path relativo al repo), 34 file, numerazione continua senza buchi.

### 2. Stato applicazione sul DB live (`supabase_migrations.schema_migrations`)

Letto direttamente `select version, name from supabase_migrations.schema_migrations order by
version` (31 righe) e incrociato con i 34 file locali per contenuto/nome. Risultato:

| File | Stato | Nota |
|---|---|---|
| 001–022 | ✅ **APPLICATA** | ogni file trova una riga corrispondente nel ledger (nomi non sempre identici al file: es. `002`→`readiness_v2`, `003`→`efficiency_points_8week_window`, coerente con la rinumerazione già nota) |
| **023** `pricing_cron` | ❌ **NON APPLICATA** | nessuna riga nel ledger corrispondente; confermato anche a livello di schema (§3) |
| **024** `lesson_tokens` | ✅ **APPLICATA** | tracciata come **due** righe nel ledger (`migration_024_lesson_tokens_core` + `migration_024_token_redeem_fns`) — un solo file nel repo, applicato in due passi |
| **025** `perf_indexes_rls` | ⚠️ **APPLICATA DI FATTO, MA ASSENTE DAL LEDGER** | **nessuna riga** nel ledger con questo nome o versione compatibile, MA verificato a schema che l'indice `workout_completions_workout_idx` esiste e la policy `workouts: lettura` è **già** riscritta con `(select is_coach())`/`(select my_tier())` come da questo file — quindi il contenuto **è stato eseguito sul DB**, semplicemente non tramite un passo tracciato nel ledger delle migration |
| **026** `lesson_buffer_zero` | ⚠️ **APPLICATA DI FATTO, MA ASSENTE DAL LEDGER** | stessa situazione di 025: nessuna riga nel ledger, ma `select buffer_min from public.services` conferma tutti i valori a `0` come da questo file |
| 027–034 | ✅ **APPLICATA** | ogni file trova riga corrispondente (`test_mode_and_11_perks`, `booking_token_and_step15`, `booking_pending`, `stripe_events`, `role_lock` — seconda occorrenza, per il file 030 — `medcert_no_file`, `readiness_note_coach`, `weekly_feedback`) |

**Riepilogo:** 31 file applicati e tracciati regolarmente · 2 file (**025, 026**) applicati di fatto
ma **non tracciati** nel ledger (drift ledger↔realtà, diverso da 023: qui lo schema combacia, manca
solo la riga di tracciamento) · 1 file (**023**) **né tracciato né applicato**, unico caso di vera
migration pendente.

### 3. `migration_023_pricing_cron.sql` — approfondimento

**Contenuto esatto del file** (`supabase/migrations/migration_023_pricing_cron.sql`):
```sql
-- ============================================================
-- GLIDE — migration_023_pricing_cron.sql  (Onda 13.5)
-- Scadenza del tier stagionale 1:1 (pagamento one-off 690€, valido fino al
-- 30 giugno della stagione) + job pg_cron giornaliero che riporta a free i
-- tier stagionali scaduti. Gli abbonamenti mensili si gestiscono via webhook.
-- ============================================================

alter table public.profiles
  add column if not exists tier_expires_at timestamptz;

comment on column public.profiles.tier_expires_at is
  'Onda 13.5: scadenza del tier stagionale 1:1 (one-off). NULL per mensili/coach '
  '(gestiti da Stripe/coach). Il job giornaliero riporta a free quando scade.';

create extension if not exists pg_cron;

-- Riporta a free i SOLI tier stagionali scaduti (hanno tier_expires_at valorizzato).
create or replace function public.expire_seasonal_tiers()
returns void language sql security definer set search_path = public as $$
  update public.profiles
     set tier = 'free', tier_expires_at = null
   where tier_expires_at is not null
     and tier_expires_at < now();
$$;
revoke execute on function public.expire_seasonal_tiers() from public;

-- Giornaliero alle 03:10 UTC.
select cron.schedule(
  'expire-seasonal-tiers',
  '10 3 * * *',
  $$ select public.expire_seasonal_tiers(); $$
);
```

**Verificato live:** colonna `profiles.tier_expires_at` **assente**
(`information_schema.columns` non la elenca — profiles ha 21 colonne, nessuna `tier_expires_at`);
estensione `pg_cron` **non installata** (`pg_extension` non contiene `pg_cron`) — coerente con
"non applicata".

**Dove il codice referenzia la colonna:** unico punto in tutto `src/`
(`grep -rn "tier_expires_at" src` → 1 risultato) — `src/app/api/stripe/webhook/route.ts`,
branch `meta.type === "season"` (righe 100-117):
```ts
} else if (meta.type === "season" && meta.swimmer_id) {
  // 1:1 stagionale (one-off): tier one_to_one fino a fine giugno; poi il
  // job pg_cron giornaliero lo riporta a free.
  await admin
    .from("profiles")
    .update({
      tier: "one_to_one",
      tier_expires_at: meta.season_end ?? null,
    })
    .eq("id", meta.swimmer_id);
  await admin.from("transactions").insert({
    swimmer_id: meta.swimmer_id,
    type: "subscription",
    amount_cents: amount,
    currency: s.currency ?? "eur",
    status: "succeeded",
    description: "Percorso 1:1 stagionale",
  });
}
```

**Modalità di fallimento — silenziosa, non un try/catch che ingoia l'errore: peggio, l'errore non
viene proprio letto.**
- L'unico `try/catch` di tutto il file è **solo** intorno a `stripe.webhooks.constructEvent(...)`
  (righe 26-33, verifica firma) — il blocco `season` **non è dentro nessun try/catch**.
- La chiamata `await admin.from("profiles").update(...)` **non distrugge `{ error }`** dal
  risultato (a differenza di altre chiamate nello stesso file, es. riga 41 `const { error: dupErr
  } = await admin.from("stripe_events").insert(...)`, che invece lo controlla). Il client
  `supabase-js` **non lancia eccezioni** su un errore Postgres/PostgREST (colonna inesistente →
  `42703`/`PGRST204`): restituisce `{ data: null, error: {...} }` senza `throw`. Con l'errore mai
  letto, l'esecuzione **prosegue normalmente** all'`insert` su `transactions` subito dopo (riga
  110-117), che **va comunque a buon fine** — quindi oggi risulterebbe una transazione "succeeded"
  con descrizione "Percorso 1:1 stagionale" **senza che il tier del nuotatore sia mai stato
  aggiornato**, e nessun errore visibile da nessuna parte.
- **Zero logging** in questo file e in `src/lib/supabase/admin.ts` (nessun `console.error`,
  nessun Sentry/`captureException`): anche volendo, oggi non ci sarebbe traccia applicativa del
  fallimento.

**Nei log: non riscontrato, ma per due motivi diversi.**
- Interrogazione diretta di `postgres_logs`/`edge_logs` (via `query_logs`, finestra di default
  24h) per `tier_expires_at`/`42703`/`stripe/webhook`: **la query è fallita due volte con
  "Backend error"** lato Supabase — non ho potuto leggere i log grezzi in questo giro (da
  ritentare più tardi se serve, non ho insistito per non eseguire polling).
- **Più concretamente:** `select * from public.transactions where description ilike
  '%stagionale%' or type='subscription'` → **0 righe**. Il branch "season" del webhook **non
  risulta mai stato eseguito** su un pagamento reale finora (nessuna transazione one-off
  stagionale registrata; `profiles.tier` oggi è solo `free`×1 e `open_plus`×10, nessun
  `one_to_one`). **Il bug è quindi latente/mai innescato finora**, non ha ancora causato un
  mancato accesso a un cliente pagante — ma si attiverebbe silenziosamente al primo acquisto 1:1
  stagionale reale.

### 4. Schema esatto live — `marketing.leads` e `marketing.test_results`

**`marketing.leads`**

| colonna | tipo | nullable | default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `email` | `text` | NO | — |
| `source` | `text` | YES | — |
| `created_at` | `timestamptz` | NO | `now()` |

Vincoli: `PRIMARY KEY (id)` (`leads_pkey`) + 3 CHECK di sola non-nullità con nomi numerici
generati automaticamente (`19516_19517_*_not_null` — pattern tipico di uno schema creato/importato
con un tool esterno via connessione Postgres diretta, non con una migration scritta a mano in
questo stile). Nessuna FK.

**`marketing.test_results`**

| colonna | tipo | nullable | default |
|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `lead_id` | `uuid` | YES | — |
| `email` | `text` | YES | — |
| `answers` | `jsonb` | NO | — |
| `profile` | `text` | YES | — |
| `created_at` | `timestamptz` | NO | `now()` |

Vincoli: `PRIMARY KEY (id)` (`test_results_pkey`) + `FOREIGN KEY (lead_id) REFERENCES
marketing.leads(id)` (`test_results_lead_id_fkey`) + 3 CHECK di non-nullità, stesso pattern di
nomi numerici di `leads`.

**RLS:** `rowsecurity = true` su entrambe (confermato via `pg_tables`); **zero righe** in
`pg_policy` per `marketing.leads`/`marketing.test_results` — nessuna policy definita. Effetto:
accesso negato di default a `anon`/`authenticated` (RLS attiva senza policy = deny-all), solo
`service_role`/superuser può leggere/scrivere. Non è quindi un buco aperto, ma resta uno schema
"fantasma": non riproducibile da un clone pulito del repo (nessuna migration lo crea), origine
non identificata da questo audit — **verosimilmente un funnel/quiz marketing esterno collegato
allo stesso progetto Postgres**, ma è un'ipotesi, non una conferma: da chiarire con te.

### 5. Vincoli rispettati
Nessun `supabase db pull` eseguito. Nessuna migration applicata. Nessuna modifica a schema, dati,
config Supabase o codice. Solo query in lettura (`execute_sql` con `select`, `list_migrations`,
2 tentativi di `query_logs` falliti lato backend) + lettura file locali.

**Fermo qui, in attesa del tuo OK prima di qualunque fix** (inclusi: applicare `migration_023`,
aggiungere logging/try-catch al webhook, decidere sulle tabelle `marketing.*`).

### 6. Seguito — 21 agosto 2026, modalità autonoma: drift 025/026 chiuso, webhook parzialmente corretto

Due interventi indipendenti, autorizzati esplicitamente (a differenza del resto di questa
indagine, che restava "solo lettura in attesa di OK"):

- **Ledger 025/026**: nessun file mancante da generare (erano già presenti e già verificati
  identici allo schema live, §2 sopra). Aggiunte solo le due righe di tracciamento in
  `supabase_migrations.schema_migrations` (version `20260721101000` `perf_indexes_rls` e
  `20260721101500` `lesson_buffer_zero`, tra 024 e 027; `created_by` marcato esplicitamente come
  backfill di ledger). **Nessuna DDL ri-eseguita.** `list_migrations` ora conta 33 righe; 025 e
  026 non sono più drift. `023` resta **non applicata, non toccata** (fuori scope, per
  indicazione esplicita — vedi STATO.md).
- **Webhook (§4 sopra, branch `season`, righe ~103–109)**: il fallimento silenzioso è stato
  corretto (errore letto esplicitamente, log strutturato con `stripe_event_id`, risposta 500
  invece di 200 così Stripe ritenta). **La colonna `tier_expires_at` e `migration_023` non sono
  state toccate**: finché 023 resta pendente, un pagamento 1:1 stagionale reale continua a fallire
  quell'update — ma ora in modo tracciato/rumoroso invece che silenzioso. Dettagli in STATO.md.

### 7. Seguito — 21 agosto 2026: deciso lo scope di `marketing.leads`/`marketing.test_results`

Su indicazione esplicita, la domanda aperta al §4 ("da chiarire con te") è stata risolta: le due
tabelle restano deny-all per la lettura ma ottengono ora **scrittura pubblica minima** (INSERT
only) per `anon`, pensata per un form/funnel esterno che deve poter inviare lead/risultati senza
mai poterli rileggere. Pre-check ripetuto prima di applicare (zero policy/grant preesistenti,
coerente col §4) e test reale con la anon key (INSERT 201, SELECT/UPDATE 401) — dettagli completi
in STATO.md. `migration_035_marketing_anon_scope.sql`, ledger `20260821143252`.

---

## S-0 (bis) — ricognizione 21 agosto 2026 · Claude Code (solo lettura, nessun fix)

> Nuovo giro di S-0 richiesto in sessione (stessi 7 punti del runbook originale + verifica
> puntuale ledger/live DB). Eseguito da un clone locale aggiornato (`main` @ `c912709`) con
> accesso Supabase MCP in sola lettura sul progetto `unsdbeliaunhhgnuefyz`.

### 0. STATO.md / .aios/HANDOFF.md — ultima sessione
- **Ultima sessione (19 ago):** rimossi i prezzi da `/app/abbonamenti` (versione di prova) — solo
  UI, nessun fix di sicurezza, nessuna migration.
- **Sessione precedente — Onda 28 (18-19 ago):** agenda "finestre raggruppate" (client-side) +
  riepilogo social/feedback settimanale (nuova tabella `weekly_feedback`, migration_034).
- **Blocchi già noti (dichiarati in HANDOFF/STATO, non riverificati qui salvo dove indicato
  sotto):** `004_consents` bloccata su DPIA/consensi (legale — **non tocco**, da vincoli sessione).
  Gate umani noti: MFA coach, leaked-password protection, backup PITR, env Upstash, CSP
  enforcing, gitleaks su git history, bump `next@16.2.12`, limiti upload video.
- Nessuna nota in STATO/HANDOFF segnalava i due punti di drift trovati sotto (§1) — non erano
  quindi noti prima di questo giro.

### 1. Ledger migrazioni — tracciato o tabelle a mano?
**In generale: tracciato.** Il progetto usa la migration history nativa di Supabase
(`supabase_migrations.schema_migrations`). 34 file in `supabase/migrations/` (001→034),
numerazione continua, nessun buco.

**Due eccezioni trovate (drift repo↔DB live), non presenti nel giro di fine luglio:**

1. **`migration_023_pricing_cron.sql` è nel repo ma NON applicata al DB live.** Verificato live:
   colonna `profiles.tier_expires_at` **non esiste**, estensione `pg_cron` **non installata**.
   - ⚠️ **Effetto collaterale reale**: `src/app/api/stripe/webhook/route.ts` (branch
     `meta.type === "season"`, ~righe 103-109) scrive già `.update({ tier: "one_to_one",
     tier_expires_at: ... })` assumendo la colonna. Su colonna assente l'update viene rifiutata
     (errore non controllato nel codice) → **un pagamento 1:1 stagionale reale oggi non
     setterebbe il tier del nuotatore.** Bug funzionale/di integrità dati scoperto durante
     l'audit, non un buco di sicurezza in senso stretto — **da confermare con te se è già
     noto/accettato in versione di prova o va trattato come blocco.**
2. **Due tabelle live non presenti in nessuna migration del repo:** `marketing.leads` e
   `marketing.test_results`. RLS **attiva** su entrambe ma **nessuna policy** (confermato da
   `get_advisors`: `rls_enabled_no_policy`) → accesso negato di default a chiunque non sia
   `service_role` (non è un buco aperto), ma sono tabelle "fantasma": create a mano o da un tool
   esterno, non riproducibili da un clone pulito via `supabase/migrations/`. Origine da chiarire
   — **non tocco lo schema marketing/consensi senza tua indicazione**.

Tutte le altre migration risultano applicate e riscontrate live a campione (indice
`workout_completions_workout_idx` di `migration_025` presente, policy `workouts: lettura`
riscritta con `(select …)` come da `migration_025`, `services.buffer_min` azzerato come da
`migration_026`).

### 2. `migration_003_tenancy` / `coach_id` su `profiles`
**Non esiste `migration_003_tenancy`** nel repo — il file `migration_003` è
`migration_003_efficiency_window.sql` (punti efficienza). Verificato live:
`information_schema.columns` su `public.profiles` → 21 colonne, **`coach_id` non presente**.
Coerente col modello coach-unico (ADR-002, `is_coach()`). Stato invariato rispetto al giro di
fine luglio.

### 3. RLS — stato per tabella + policy `profiles`
**RLS attiva su tutte le 39 tabelle di `public`** (+ le 2 di `marketing`, vedi sopra) — nessuna
tabella applicativa senza RLS.

**`profiles` — un utente può cambiare il proprio `role`? No, doppia difesa, verificata live:**
- Trigger `protect_role_column` (`migration_015`, `tgenabled='O'` = attivo) rifiuta l'update se
  `role` cambia e l'attore è `authenticated`/`anon`.
- Policy `profili: modifica propria o coach` (`migration_030`): `with check` richiede
  `is_coach()` oppure (`id = auth.uid()` **e** `role` invariato). Trigger gemello
  `protect_tier_column`, anch'esso attivo, protegge `tier` allo stesso modo.
- Policy di lettura (`profili: lettura propria o coach`): `id = auth.uid() or is_coach()`.

Nessuna escalation di ruolo possibile dal client con le chiavi attuali — invariato rispetto al
giro di fine luglio (qui solo riconfermato live).

### 4. Webhook Stripe — firma su raw body o `req.json()`?
**Raw body, corretto** (invariato): `req.text()` → `stripe.webhooks.constructEvent(raw, sig,
secret)`. Idempotenza via `stripe_events(id)` unique, già presente (chiusa nel ciclo precedente,
`migration_031`). Fail-open intenzionale se l'insert di dedup fallisce per motivo diverso da
duplicato — comportamento voluto, non un buco.

### 5. Bucket video — pubblico o privato?
**Privato**, invariato: `race-videos` → `public: false` (verificato live), idem `library` e
`medical` (`public: false`). Accesso solo via signed URL (`src/lib/storage.ts`); `medical` a
300s invece di 3600s.

### 6. Env `NEXT_PUBLIC_*` che sembrano contenere segreti
Nessuna novità rispetto al giro precedente: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
— tutte pubblicabili per design. Le chiavi sensibili (`SUPABASE_SERVICE_ROLE_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`) sono senza prefisso, corretto.

### Extra — trovato durante l'audit, non richiesto esplicitamente ma rilevante
Da `get_advisors(type=security)` sul progetto live:
- **7 funzioni `SECURITY DEFINER` chiamabili via RPC da `anon`/`authenticated`:**
  `grant_monthly_tokens`, `is_coach`, `link_lesson_token`, `my_tier`, `release_lesson_token`,
  `reserve_lesson_token`, `test_mode`. Per `is_coach`/`my_tier`/`test_mode` probabilmente
  intenzionale (il client legge il proprio stato). Per
  `grant_monthly_tokens`/`reserve_lesson_token`/`release_lesson_token`/`link_lesson_token` **non
  ho verificato il corpo delle funzioni** in questo giro (fuori dai 7 punti richiesti) — segnalo
  solo che sono chiamabili via `/rest/v1/rpc/...` da chiunque sia autenticato (alcune anche da
  anonimo): da valutare se le funzioni fanno già i controlli giusti (es. solo sul proprio
  `swimmer_id`) prima di eventuali fix.
- `auth_leaked_password_protection` disabilitata — già in elenco gate umani noti, nessuna novità.

### Non toccato in questo giro (fuori scope / vincoli sessione)
Informative privacy/consensi/retention/DPIA, `migration_004_consents`, vocabolario clinico/ADR-004,
configurazione progetto Supabase (regione/piano/backup), corpo delle funzioni RPC in "Extra".

---

## S-0 — ricognizione 28 luglio 2026 · Claude Code (solo lettura, nessun fix)

**Eseguito:** 28 luglio 2026 · Claude Code (solo lettura, nessun fix)
**Progetto DB:** Supabase `unsdbeliaunhhgnuefyz` (region `eu-central-1` / Frankfurt)
**Runbook:** `PROMPT_CODE_SEC.md` (S-0)

> ⚠️ **Divergenza runbook ↔ realtà.** L'audit `GLIDE_SECURITY_AUDIT_v1.md` e il runbook
> sono stati scritti su un modello **inferito dai prototipi** (ledger vuoto, 11 tabelle a mano,
> `003_tenancy` con `coach_id`). Il repo reale è **molto più avanti**: 29 migration tracciate,
> role-lock già presente, bucket video già privato. Diverse voci "critiche" risultano **già chiuse**.
> Questo cambia il piano di S-1 (vedi §Riconciliazione).

### Risposte alle 7 domande di S-0

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

### Stato dei finding critici (riletti sul codice reale)

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

### Riconciliazione col runbook (impatto su S-0.5 / S-1)

1. **S-0.5 non applicabile come scritto.** Non c'è CLI Supabase in questo ambiente (`supabase db pull`
   impossibile) **e** il ledger è già tracciato (001→029): non c'è baseline da rifare.
2. **`coach_id` NON esiste su `profiles`.** Verificato via `information_schema`. Il repo usa il modello
   **coach-unico** (`is_coach()`, ADR-002), non multi-tenant. Non c'è `migration_003_tenancy`.
3. **Conseguenza su S-1 (role-lock):** la policy proposta nel runbook referenzia `coach_id` — quella riga
   va **omessa**. Il role-lock utile qui = policy `with check` che congela `role` (e `tier`) sul valore
   corrente, **sopra** il trigger già presente. Da decidere con Alessio prima di scrivere `migration_006`.
4. **`migration_004_consents` non esiste** in questo repo (il 004 è `backfill_ledger`). Vincolo ⛔ rispettato
   per costruzione: non c'è nulla da (non) applicare.

### Cosa NON ho toccato in S-0 (vincoli ⛔ rispettati)
Nessun fix, nessuna migration applicata, nessun drop, nessuna modifica alla config Supabase,
nessun testo consenso/retention/DPIA, nessun vocabolario clinico. Solo lettura + questo file.

### Stato finale dei finding (dopo S-1 → S-4)

| Finding | Stato | Dettaglio |
|---|---|---|
| **C-1** escalation ruolo | ✅ **chiuso** | trigger `protect_role_column` + policy che congela `role` nel self (`migration_030`). Test SQL + gate manuale. |
| **C-2** webhook Stripe | ✅ **chiuso** | firma su raw body (già) + idempotenza `stripe_events` (`migration_031`). |
| **C-3** regione UE | ✅ | `eu-central-1`. |
| **C-4** service_role client | ✅ | nessun segreto in `NEXT_PUBLIC_`; guardia `scripts/check-secrets.sh`. |
| **C-5** video privato | ✅ | bucket privato + signed URL 1h. |
| **A-1** copertura RLS | ✅ | tutte le tabelle RLS+policy; `stripe_events` deny-all; `scripts/rls-audit.sql` → 0. |
| **A-2 / A-2bis** cron | ✅ | `cronAuthorized` fail-closed su digest + video-purge (`src/lib/cron-auth.ts`) + test. Gate: `CRON_SECRET` su Vercel (già impostata). |
| **A-4** health router | ✅ **enforce** | matcher deterministico server-side prima dell'LLM; nessun percorso lo salta; verso l'LLM va **solo** il messaggio (mai nome/email). Test `safety.test.ts`. Vocabolario ADR-004 invariato. |
| **A-6** segreti | 🟡 parziale | `.env*` gitignored, `check-secrets.sh` sul bundle. **Umano:** scansione git history (gitleaks) + rotazione se esposti. |
| **A-7** security headers | 🟡 | header "duri" **enforced**; **CSP in Report-Only** (da promuovere a enforcing dopo verifica violazioni + checkout Stripe). |
| **M-1 / M-2** baseline migrazioni | ✅ N/A | il ledger è già tracciato (001→031): non serve baseline. |
| **M-3** leads separati | ✅ | sito e app su tabelle/progetti distinti (invariato). |
| **M-4** rate limiting | ✅ | Upstash (`src/lib/ratelimit.ts`) su `/api/assistant` e auth. Gate: env Upstash su Vercel. |
| **M-5** validazione input | 🟡 parziale | le server action validano; audit completo dei form resta da fare. |
| **M-6** upload video | 🟡 parziale | bucket privato ok; **aperto:** limiti MIME/dimensione/durata sull'upload. |
| **Email "notifica non contiene"** | ✅ | digest coach → solo conteggi + "Apri GLIDE" (niente dati sanitari in email). |
| **npm audit HIGH (postcss/sharp)** | 🟡 aperto | fix = `next@16.2.12` (patch); bump **a parte e verificato** (Next modificato, `AGENTS.md`). Dependabot attivo. |

**Gate umani residui (non è codice):** test manuale role-escalation · MFA coach · leaked-password (Pro) · backup PITR+restore · promozione CSP a enforcing · scansione git history · limiti upload video · bump `next` · env Upstash su Vercel.
