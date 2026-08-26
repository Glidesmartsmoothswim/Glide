# STATO — GLIDE

> PWA coaching nuoto Master · Next.js 16 (App Router) + TS + Supabase + Stripe.
> Documento di stato: aggiornato **alla fine di ogni sprint**, così le sessioni
> future ripartono da qui.

_Ultimo aggiornamento: 2026-08-26 — **leak retroattivo nel ledger corretto in diretta**
(`activity_events`, 22 righe con `corpo`/`health_flag`, dato sanitario a conservazione illimitata
— vedi migration_042) · **ADR-013 v3.1: rimozione blocco dolore strutturato dal readiness
+ fatigue/soreness legacy** (PROPOSTO, codice pronto, migration_041 NON applicata) (modalità
autonoma) ·
MFA (TOTP) sull'account, FASE 1: enrollment (modalità autonoma; FASE 2 bloccata, attende conferma
umana) ·
**S-5: revoke EXECUTE anon su RPC lesson token (C-6) +
zone_rpe_bands ristretta a authenticated (C-7)** (modalità autonoma, migration_040) ·
Sec fix C-6/C-7 (23 ago): ownership check RPC lesson token (IDOR) + grant_monthly_tokens non più
pubblica (migration_039) · ONDA 29: allineamento grafico vista nuotatore · rimozione badge (codice) ·
via l'etichetta "stile" dalle righe workout · via il +/- percentuale (sostituito da "Chiedi una
modifica") · builder allenamento self-service Canale Open (ADR-012) (modalità autonoma) ·
migration_035 (21 ago) · Ledger 025/026 tracciato + fix fallimento silenzioso webhook Stripe ·
S-0 (bis) · Onda 28 · Onda 27 · Onda 26 · Onda 25.**_

## 🚨 Leak retroattivo nel ledger — corretto in diretta (26 ago, modalità autonoma)

- **Scoperto durante ADR-013 v3.1:** `migration_004_backfill_ledger.sql` (già applicata il 15/7)
  scriveva `corpo`/`health_flag` nel payload di `activity_events` per gli eventi `readiness.pre`.
  `activity_events` è a conservazione **ILLIMITATA** (`GLIDE_REGISTRO_TRATTAMENTI.md` §10) — dato
  sanitario che non ci deve stare, a prescindere dalla colonna sorgente.
- **Verificato dal vivo PRIMA di agire** (non dato per scontato dal prompt): 22 righe coinvolte,
  dal 12/7 al **25/8 — un giorno prima di questa sessione**, quindi il leak era ancora attivo, non
  solo storico. Utenti attivi coinvolti, non solo tester in cancellazione.
- **`migration_042_ledger_strip_sensitive_payload.sql` — APPLICATA subito** (a differenza di
  migration_041, sotto): `update activity_events set payload = payload - 'corpo' - 'health_flag'
  where payload ? 'corpo' or payload ? 'health_flag'`. Nessun prerequisito la bloccava (a
  differenza del DROP COLUMN di migration_041): tratta dati reali già impropriamente conservati,
  nessun impatto funzionale. Verificato dopo l'apply: **0 righe rimaste**.
- **`migration_004_backfill_ledger.sql` corretta per igiene** (già applicata, non rigira per il
  guard idempotente — editarla non tocca il DB): rimossi `corpo`/`health_flag` dal blocco
  `readiness.pre`, così uno stesso script non riprodurrebbe il leak su un DB vuoto.
- **Path applicativo live:** verificato che `src/app/app/readiness-actions.ts` **non scrive più**
  `corpo`/`health_flag` nel payload di `readiness.pre` — fix già presente nel lavoro ADR-013 di
  questa stessa sessione (non serviva un secondo fix). **Ma non è ancora in produzione**: PR #45
  non è mersata. Finché resta aperta, ogni nuovo check-in in produzione riapre il leak da capo —
  mersare quella PR (la sola parte codice, indipendente dalla migration schema) è la priorità
  reale qui, più della migration_041 stessa.
- **Test — `test/db/ledger-no-sensitive-payload.test.ts`** (nuovo): (1) nessuna riga di
  `activity_events` ha `corpo`/`health_flag` nel payload; (2) l'ultimo `readiness.pre` reale non
  li contiene. Stesso pattern skip-senza-config di `readiness-schema.test.ts`.

## 🩺 ADR-013 — Rimozione blocco dolore strutturato dal readiness (26 ago, modalità autonoma)

- **v3.1 (`PROMPT_CODE_READINESS_V3_1.md`):** aggiunge al drop di migration_041 anche `fatigue`/
  `soreness` — colonne legacy pre-v2 (migration_002), stesso problema di `corpo` sotto altro nome,
  verificato che nessun codice applicativo le legge (solo un commento). Vedi anche la sezione
  sopra per il leak retroattivo scoperto nello stesso giro.
- **Contesto:** seguito di `PROMPT_CODE_READINESS_V3.md` + `GLIDE_QUESTIONARIO.md` (v3) +
  `GLIDE_SECURITY_AUDIT_v2.md`/DPIA — `pain_sites`/`corpo`/`health_flag`/`red_flag` in `readiness`
  sono dato sanitario ai sensi del GDPR a prescindere dall'uso. Rimozione completa (nessuna
  eccezione), come da ADR-013.
- **Numerazione ADR:** il prompt sorgente citava questa decisione come "ADR-012", ma quel numero
  è già in uso ovunque nel codice per il builder self-service Canale Open (Onda 29.5 — vedi riga
  sopra), mai formalizzato in `GLIDE_ADR.md` ma citato come esistente in 9+ file/test. Rinumerata
  **ADR-013** per non collidere (confermato con l'utente prima di scrivere).
- **Stato: PROPOSTO, non ACCETTATO.** Come da vincoli del prompt sorgente, non cambio lo stato
  senza conferma esplicita.
- **Migration `migration_041_readiness_remove_pain_fields.sql`: scritta, NON applicata al
  progetto Supabase live.** È un DROP COLUMN irreversibile su dati reali; il prerequisito
  "pulizia dati di test" non risultava confermato in questa sessione e l'ADR è ancora PROPOSTO —
  confermato con l'utente di preparare tutto senza eseguire nulla sul DB reale. Drop viste
  (`v_readiness` cascade) + colonne + ricreazione delle 3 viste con `readiness_fisica =
  (sonno+energia)/2` (era `/3` con `corpo`); query di verifica post-apply e grant incluse nel
  file. Da applicare (via MCP Supabase o dashboard) solo dopo: pulizia dati tester confermata,
  ADR-013 passato ad ACCETTATO.
- **Applicativo:** rimossi da `src/lib/readiness.ts` (`PRE_QUESTIONS.corpo`, `PAIN_SITES`,
  `RED_FLAG_LABEL`, `L2_TEMPLATE`, campi dal tipo `VReadinessRow`); `readiness-actions.ts`
  (`savePre` non gestisce più corpo/pain_sites/health_flag/red_flag, niente più notifica coach
  da qui); `checkin.tsx` (via la scala "Come sta il corpo?", il chip "Dove?", il chip rosso
  ⚠️ Petto/respiro/testa); `progress.tsx` (via la card "Dolori segnalati", dati sparsi con la
  colonna). Il matcher L1/L2 di ADR-004 (chat/nota, testo libero) **non toccato**: resta l'unico
  canale per segnalare dolore/sintomi.
- **Digest coach (`src/lib/digest.ts`):** rimosse le sezioni "Da chiamare" (da `red_flag`) e
  "Corpo" (dolore ricorrente da `pain_sites`) — la loro unica fonte dati sparisce con la
  migration, lasciarle avrebbe rotto la query in produzione. Confermato con l'utente prima di
  toccarle (non erano nella lista "segnala soltanto" del prompt sorgente). Corretta anche una
  formula duplicata trovata durante il giro: "Sta scivolando" calcolava `readiness_fisica` come
  `(sonno+energia+corpo)/3` invece che tramite la vista — ora `(sonno+energia)/2`, coerente con
  ADR-013. Il segnale rosso resta comunque immediato via `notifyCoaches` dal matcher ADR-004,
  indipendente dal digest settimanale.
- **Copy onboarding:** aggiornato sia `src/components/onboarding/onboarding.tsx` sia
  `docs/GLIDE_ONBOARDING.md` (dovevano restare identici) — "5 domande" → "4 domande", via il
  riferimento a "dove fa male", esplicitato che dolore/sintomi si scrivono in chat o nella nota
  ("il tap guidato non c'è più", checklist del prompt sorgente). Aggiornata anche la checklist
  di collaudo B1/B2 nello stesso file.
- **`docs/GLIDE_QUESTIONARIO.md`** sostituito con la v3 (fornita nel prompt sorgente): 4 domande
  invece di 5, formula `readiness_fisica` a 2 termini, nota su dove segnalare dolore/sintomi.
- **Test — `test/db/readiness-schema.test.ts`** (aggiornato in v3.1): (1) insert con ciascuna delle
  6 colonne rimosse (`pain_sites`/`corpo`/`health_flag`/`red_flag`/`fatigue`/`soreness`) deve
  fallire colonna-inesistente, (2) select dalle 3 viste deve riuscire, (3) `readiness_fisica` letto da
  `v_readiness` deve combaciare con `(sonno+energia)/2` su una riga reale. **Non importa**
  `@/lib/supabase/admin`/`@/lib/env` (quel modulo fa crash a import-time se le env pubbliche
  mancano): costruisce un client Supabase proprio, e salta con `test.skip` se
  `NEXT_PUBLIC_SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` non sono configurate — verificato che
  in questo stato **salta pulito, non fallisce**. Aggiunto `test/**/*.test.ts` al glob di `npm
  test` in `package.json` (prima solo `src/**/*.test.ts`): senza, questo file non sarebbe mai
  girato. A differenza della deviazione dichiarata in S-5 (SQL invece di `.test.ts` per non
  "colpire l'API REST live con credenziali reali"), qui il file resta `.test.ts` come chiesto
  perché le sue query live sono a sola lettura o a fallimento voluto (nessuna scrittura reale):
  girare in CI con secrets configurati non avrebbe lo stesso rischio.
- **Verificato:** `npx tsc --noEmit` pulito, `npx eslint` pulito sui file toccati, `npm test` →
  28/28 pass preesistenti + 3 nuovi test **skip** (nessuna migration applicata, come da scelta
  sopra) — nessuna regressione.
- **Non toccato (fuori scope, come da vincoli):** il matcher ADR-004 (`safety.ts`/`router.ts`,
  solo un commento di `router.ts` corretto perché parlava di un `health_flag` non più esistente);
  il riferimento obsoleto al certificato medico in ADR-004 (già segnalato in ADR-013 stesso); la
  soglia `readiness_fisica >= 3.5`; `GLIDE_PRODUCT_BIBLE_v1.0.md`/`GLIDE_GAMIFICATION.md` (la
  sezione §8 lì descritta già non combacia 1:1 con `digest.ts` da prima di questa sessione —
  riconciliarla è un lavoro più ampio, non di questo ADR); i `PROMPT_CODE_*.md` storici (sono
  verbali di sessioni passate, non spec vive).
- **Prossimi passi (non fatti qui, serve conferma umana):** 1) pulizia dati di test
  (profili/readiness/certificati/video dei tester); 2) ADR-013 PROPOSTO → ACCETTATO; 3) applicare
  `migration_041...sql` al progetto live; 4) rigirare `test/db/readiness-schema.test.ts` con le
  env configurate per confermare che passi davvero.

## 🔐 MFA (TOTP) sull'account — FASE 1: enrollment (26 ago, modalità autonoma)

- **Contesto:** `PROMPT_CODE_COACH_MFA.md` — B-1 di `GLIDE_SECURITY_AUDIT_v2.md` (account coach
  senza MFA, unico ruolo che vede dati sanitari di tutti). Finora era trattato come puro gate
  umano da dashboard Supabase; questo prompt chiede una UI in-app per l'enrollment, in due fasi
  con uno stop obbligatorio in mezzo.
- **Verificato prima di scrivere codice (come richiesto):** nessun flusso 2FA/MFA/TOTP esisteva
  già nel repo — solo menzioni nei documenti di audit/DPIA come azione da fare. Nessuna
  duplicazione.
- **Vincolo di sessione rispettato: FASE 2 NON eseguita.** Solo enrollment (FASE 1). `is_coach()`
  non è stato toccato. Serve conferma esplicita "MFA attivo, ho verificato" dopo un login reale
  del coach prima di procedere alla FASE 2 (irrigidire `is_coach()` a `aal2`).
- **`src/lib/mfa.ts`** (nuovo): logica pura di orchestrazione (`getMfaStatus`, `enrollTotp`,
  `verifyTotpCode`, `unenrollFactor`, `isAal2`), tipizzata contro un sottoinsieme strutturale di
  `SupabaseClient["auth"]["mfa"]` — testabile con un fake sincrono, nessun progetto Supabase live
  richiesto per i test. `unenrollFactor` rifiuta (`needsStepUp: true`) se la sessione corrente non
  è già `aal2`, come richiesto dal prompt; non chiama mai `unenroll()` reale in quel caso.
- **`src/components/account/mfa-settings.tsx`** (nuovo, client component): UI — stato attuale
  (`listFactors`), "Attiva 2FA" → QR code (`totp.qr_code`, già gestito come possibile data-URI o
  SVG grezzo) + secret in chiaro + campo codice a 6 cifre → verifica; messaggio esplicito post-
  attivazione su registrare un fattore di backup; "Disattiva" che, se la sessione non è aal2,
  propone uno step-up (verifica un codice adesso, senza serve un nuovo login) prima di procedere.
  Nessun gating per ruolo nel componente stesso — lo decide la pagina che lo monta.
- **Montato in due punti**, nessuna eccezione per ruolo: `src/app/app/profilo/page.tsx` (nuova
  sezione "Sicurezza", nuotatore) e `src/app/coach/sicurezza/page.tsx` (nuovo, route statica che
  ha precedenza su `/coach/[section]`; aggiunta voce "Sicurezza" alla sidebar coach, nuovo gruppo
  "Account").
- **Test — `test/auth/mfa-enrollment.test.ts`** (nuovo), contro un fake locale del client MFA
  (nessuna rete, nessun Supabase live): (1) enroll → verify con codice corretto → fattore
  `verified`; (2) verify con codice sbagliato → fattore resta `unverified`, sessione resta aal1
  (nessun accesso concesso); (3) `listFactors` dopo enrollment riuscito mostra il fattore; (4)
  `unenroll` rifiutato su sessione aal1, riuscito dopo uno step-up che eleva ad aal2. Aggiunto
  `test/**/*.test.ts` al glob di `npm test` in `package.json` (stesso fix già fatto su un altro
  branch per `test/db/`, qui rifatto perché questo branch parte da `main`).
- **Verificato:** `npx tsc --noEmit` pulito (incluso allineare i tipi di `src/lib/mfa.ts` ai tipi
  reali di `@supabase/auth-js` — `factor_type` non `factorType` sull'oggetto fattore,
  `AuthenticatorAssuranceLevels` è `'aal1'|'aal2'|(string & {})` non un'unione chiusa), `npx
  eslint` pulito sui file toccati, `npm test` → 32/32 (28 preesistenti + 4 nuovi).
- **Prossimi passi (bloccati, non fatti qui):** 1) login reale del coach fuori da questa
  sessione, attiva il fattore con la sua app authenticator, verifica al login successivo
  (logout/login, chiede il codice); 2) conferma esplicita in chat; 3) solo allora, FASE 2 —
  `is_coach()` richiede `aal2` — in una sessione separata, mai insieme alla FASE 1.

## 🔒 S-5 — Revoke EXECUTE anon su RPC lesson token (C-6) + zone_rpe_bands → authenticated (C-7) (24 ago, modalità autonoma)

- **Contesto:** seguito di `GLIDE_SECURITY_AUDIT_v2.md` (verificato live via MCP, non solo
  documentale) e `PROMPT_CODE_SEC_S5.md` — due fix a basso rischio sulla superficie EXECUTE/RLS
  residua, entrambi confermati da query dirette prima di scrivere qualunque cosa (non da ipotesi).
- **Vincoli sessione rispettati:** non toccato `EXECUTE` su `is_coach()`/`my_tier()`/`test_mode()`
  (chiamate da dentro le policy RLS stesse — revocarle avrebbe rotto ogni policy che le usa); non
  toccata la policy `"profili: modifica propria o coach"` (C-8, decisione di tenancy che aspetta un
  ADR); nessuna funzione droppata/rinominata; fix applicato **solo** come migration tracciata
  (`migration_040_s5_anon_execute_zone_bands.sql`, ledger `20260824...`).
- **C-6:** `link_lesson_token`/`release_lesson_token`/`reserve_lesson_token` avevano già il check di
  ownership interno (23 ago), ma restavano chiamabili da `anon` — nessun caso d'uso legittimo
  pre-login le richiede. `revoke execute ... from anon` su tutte e tre; `authenticated` invariato
  (verificato live che uno swimmer autenticato continua a riservare il proprio token).
- **C-7:** policy `bands_read` su `zone_rpe_bands` era `using(true)` senza clausola `to` (scoped a
  PUBLIC di fatto, `polroles={-}`) — la mappatura Z1-Z5/RPE del protocollo era leggibile via REST
  anche senza login. Ristretta a `to authenticated`; `bands_write` (già `is_coach()`) non toccata.
- **TEST — eseguito LIVE sul DB reale**, impersonando `anon` e `authenticated` (swimmer reale) via
  `set_config('request.jwt.claims', …, true); set local role …;` dentro una transazione con
  rollback finale, cleanup verificato: **6/6 scenari attesi confermati** (3× `anon` → `permission
  denied` 42501 sulle tre RPC prima del check ownership, swimmer autenticato → riuscito; `anon` su
  `zone_rpe_bands` → 0 righe, `authenticated` → 5 righe). Regressione simulata per entrambi i fix
  (ri-concesso il grant/riaperta la policy dentro una transazione con rollback) e confermato che i
  test strutturali la intercettano.
- **Deviazione dichiarata dal prompt sorgente:** chiedeva `test/security/*.test.ts` — `npm test`
  gira solo su `src/**/*.test.ts` (`package.json`), e un test `.test.ts` che verifichi il 401/403
  end-to-end colpirebbe l'API REST live di produzione con credenziali reali (fragile in CI). Scritti
  invece `test/security/lesson-token-anon-execute.sql` e `test/security/zone-bands-anon-read.sql`,
  stesso pattern strutturale già in uso in questo repo (`role-lock.sql`/`workouts-self-kind.sql`/
  `rpc-ownership-lesson-tokens.sql`), con la verifica comportamentale comunque eseguita live a
  colmare la differenza. Dettaglio completo in `SECURITY_AUDIT.md`.

## 🔒 Sec fix C-6/C-7 — Ownership RPC lesson token + grant_monthly_tokens (23 ago, modalità autonoma)

- **Contesto:** l'indagine S-0 (bis) del 21 agosto (sezione "Extra" più sotto in questo file/in
  `SECURITY_AUDIT.md`) aveva trovato 7 funzioni `SECURITY DEFINER` chiamabili via RPC da
  anon/authenticated, senza verificarne il corpo. Richiesta di oggi: verificare e correggere
  `grant_monthly_tokens` (ARANCIO) e `reserve_lesson_token`/`link_lesson_token`/`release_lesson_token`
  (ROSSO, IDOR).
- **Vincoli sessione rispettati:** nessuna funzione droppata/rinominata, nessun'altra `SECURITY DEFINER`
  toccata, nessuna decisione nuova sulla regola coach-per-conto-di-swimmer (riusata quella già in
  vigore: `auth.uid() = proprietario OR is_coach()`), nessun `git push --force`, fix applicato **solo**
  come migration tracciata (`migration_039_rpc_ownership_checks.sql`, ledger `20260823...` — baseline
  già attiva, coerente col resto del progetto).
- **C-7 (grant_monthly_tokens):** `revoke execute ... from anon, authenticated`. Verificato live che
  il grant a `postgres`/`service_role` (usato dal cron `pg_cron`) resta intatto.
- **C-6 (IDOR lesson token):** aggiunto in tutte e tre un check di ownership con `raise exception`
  esplicito prima di qualunque update. **Bug trovato e corretto durante il test live:** la forma
  ovvia `not (auth.uid() = p_swimmer or is_coach())` è NULL (non TRUE) quando `auth.uid()` è NULL
  (chiamante `anon` senza `sub`) — un anon senza identità avrebbe bypassato il check silenziosamente.
  Corretto con `(...) IS NOT TRUE` (NULL-safe). `link_lesson_token`/`release_lesson_token` non avevano
  questo bug (il loro check passa da un `EXISTS(...)`, già NULL-safe per costruzione).
- **TEST OBBLIGATORIO — eseguito LIVE sul DB reale**, impersonando due nuotatori reali distinti (A, B)
  + un coach reale + `anon` + `service_role` via `set_config('request.jwt.claims', …, true); set local
  role …;` dentro una transazione, poi rollback + cleanup verificato (0 righe residue) — stesso metodo
  di Onda 29.5: **11/11 scenari attesi confermati**, incluso che il percorso interno
  `/api/booking/create` (via `service_role`) resta intatto e non regredisce nell'esenzione dal check.
  Dettaglio scenari in `SECURITY_AUDIT.md`. Test strutturale di regressione aggiunto in
  `test/security/rpc-ownership-lesson-tokens.sql` (stesso stile di `role-lock.sql`/
  `workouts-self-kind.sql`) — verificato che fallisce davvero se un fix viene rimosso, non solo che
  passa oggi.
- **Non toccato:** `is_coach`, `my_tier`, `test_mode` (chiamabili da anon/authenticated per design,
  già annotato nell'indagine del 21 agosto) — nessun'altra funzione `SECURITY DEFINER` toccata, come
  da vincolo.

## 🌊 ONDA 29 — Allineamento grafico nuotatore · Rimozione badge · Builder self-service Open (23 ago, modalità autonoma)

### 29.1 — Allineamento grafico vista nuotatore ai token unici (ADR-009 / GLIDE_TIPOGRAFIA.md)
- **Fonte unica del brand confermata:** `src/app/globals.css` (`@theme inline` + variabili `--ink/--turchese/--navy/--blu/--teal`, classi `.t-display/.t-h1…t-label/.t-data`) + `src/app/fonts.ts` (Glacial Indifference 400/700 via `next/font/local`). **`lib/tokens.ts` NON è la fonte del brand** — nome fuorviante, contiene solo i *lesson token* delle lezioni 1:1 (Onda 13.6), dominio diverso; non toccato.
- **Audit vista nuotatore (27 file, `src/app/app/**` + componenti condivisi importati dalla vista nuotatore):**
  - **`font-weight: 600` (VIETATO, TIPOGRAFIA §1) ovunque** — Tailwind `font-semibold`/`font-medium` erano il pattern dominante per l'enfasi (bottoni, titoli card, prezzi…). **Sostituito con `font-bold` (700, peso reale)** in tutti e 27 i file: `app/app/**` (nuoto, libreria, abbonamenti, video, profilo…) + componenti condivisi (`ui/card.tsx`, `pricing-card.tsx`, `workout-card/-hand/-adjust.tsx`, `booking/*`, `home-greeting.tsx`, `upgrade-hint.tsx`, `notif-list.tsx`, `placeholder.tsx`, `swimmer-tabbar.tsx`, `video/uploader.tsx`, `assistant-widget.tsx`). **Nota:** questo era presente **identicamente anche lato coach** (44 occorrenze) — non toccato lì, fuori dallo scope di questo task (solo vista nuotatore).
  - **Testo sotto 14px (VIETATO, TIPOGRAFIA §2 — "niente scende sotto i 14px, nemmeno le didascalie")** — `text-xs` (12px) usato per didascalie/etichette/errori in 22 file lato nuotatore: **portato a `text-sm` (14px)**. Più alcune taglie arbitrarie sotto i 14px (`text-[10px]/[11px]/[13px]`) in `profile-wizard.tsx`, `pricing-card.tsx`, `checkin.tsx`, `swimmer-tabbar.tsx`, `libreria/page.tsx`, `workout-hand.tsx`: stessa correzione.
  - **Pattern "etichetta" ricostruito ad-hoc invece del token `.t-label`** (es. `text-xs font-semibold uppercase tracking-wide text-blu`, il tag "occhiello" descritto in TIPOGRAFIA §3) in 4 punti (`libreria/page.tsx`, `video/page.tsx`, `program-home-card.tsx`, `workout-hand.tsx`): **sostituito con la classe `.t-label`** già definita in `globals.css` — stessa resa, ma ora dalla fonte unica invece che da una combinazione di utility ricostruita a mano.
  - **Colori hardcoded fuori palette:** nessun hex nuovo introdotto lato nuotatore. Trovati `#DC2626` (errori form) e `#B45309`/`#FFF7E6`/`bg-amber-500` (stato "warning", da `ui/card.tsx` Card/Pill variant) — **non toccati**: sono baked-in nel componente `Card`/`Pill` condiviso, **identici lato coach** (nessuna disallineamento nuotatore↔coach da correggere) e la palette chiusa (TIPOGRAFIA §6) non prevede un colore di stato "attenzione/errore" alternativo — ridisegnare l'intero sistema di stato è una decisione più ampia, non richiesta qui, e non è la causa del sintomo segnalato ("vista nuotatore con grafiche vecchie").
  - **Font diversi da Glacial Indifference:** nessuno trovato lato nuotatore (nessun `font-family`/`fontFamily` custom fuori da `fonts.ts`/`globals.css`).
  - **Body 17px minimo + `font-synthesis: none`:** già globali in `globals.css` (`body{font-size:17px}` e `*{font-synthesis:none}`), coprono l'intera app inclusa la vista nuotatore — nessuna modifica necessaria, verificato.
- **Non toccato (fuori scope, per completezza):** `src/components/shell/coach-sidebar.tsx` ha un `text-[10px]` — è lato coach, non nuotatore.
- `npx tsc --noEmit` verde. `npx eslint` sui 29 file toccati: **0 nuovi errori** — i 2 preesistenti (`assistant-widget.tsx`, `home-greeting.tsx`, regola `react-hooks/set-state-in-effect`, non relativi a questo cambio) restano, non toccati.

### 29.2 — Rimozione badge (codice)
- **Contesto:** tabelle `badges`/`swimmer_badges` **già svuotate a DB** (richiesta esplicita). Rimosso tutto ciò che le usava lato codice.
- **File eliminati:** `lib/badges/detect.ts` (detection automatica, ex FASE 6.3 `PROMPT_CODE_MASTER.md`), `components/badges/badge-shelf.tsx` (rendering badge, nuotatore+coach), `components/badges/confer-badges.tsx` (UI coach "Conferisci badge", ex FASE 6.1), `app/coach/nuotatori/[id]/badge-actions.ts` (server action di conferimento).
- **File modificati (rimossi import/query/sezioni):** `app/coach/nuotatori/[id]/page.tsx` (tolta la sezione "Badge" + la query `swimmer_badges`/`badges`), `app/app/progressi/page.tsx` (tolta `<BadgeShelf>` + la query dei badge guadagnati), `app/api/cron/digest/route.ts` (tolta la chiamata notturna `detectAndAward`, ex FASE 6.4).
- **Falsi positivi verificati e NON toccati** (stessa parola "badge" ma è la UI generica a "pillola/etichetta", non gamification): `pricing-card.tsx` (prop `badge` = ribbon "Consigliato"), `abbonamenti/page.tsx` (passa quella prop), `shell/placeholder.tsx` (pill "simulato"), `agenda/coach-agenda.tsx` (`ModeBadge`/`PayBadge`, pillole modalità/pagamento lezione), `lib/flags.ts` (commento).
- **Non toccato, per esplicita indicazione:** Glide Score, Onda, Effetto Acqua — invariati. `lib/identity` (§6, Esploratore/Costante/Tecnico/Competitore/Mentore) **non è un badge**, resta: ma la sua lettura di `swimmer_badges`/`badge_code='capitano'` per riconoscere l'identità **Mentore** ora non scatterà mai più (tabella vuota per sempre) — **nota aperta, non decisa qui** (lasciare dormiente / agganciare "Mentore" a un altro segnale / rimuovere il ramo).
- **`docs/GLIDE_GAMIFICATION.md` §5** marcata **🔴 RIMOSSA** con nota (sezione storica lasciata sotto, non cancellata — richiesto).
- Nessuna migration/DROP eseguita: solo codice, come richiesto ("le tabelle sono già state svuotate a DB").
- `npx tsc --noEmit` verde. `npx eslint` sui file toccati: pulito. `npm test`: **28/28 verdi** (nessun test copriva i badge).

### 29.3 — Via l'etichetta "stile" da ogni riga workout
- **Causa:** `lineLabel()` (`lib/workout.ts`) non affiancava un tag alla riga — la **sostituiva**: ricostruiva l'intera riga da `parseLine()` espandendo lo stile (`STROKES[p.stroke]`, es. `SL`→`"Stile"`), così il render mostrava solo la versione ricostruita, mai lo shorthand esatto scritto dal coach.
- **Le due viste che renderizzano le righe** (coprono editor coach, anteprima nuotatore e digest, che riusano lo stesso componente): `components/workout/editor.tsx` (anteprima live nell'editor) e `components/workout/workout-card.tsx` → `BlockList` (usato da `WorkoutCard`/`CoachWorkoutCard` — scheda coach, scheda nuotatore, `/coach/open`, `/app/nuoto`, archivio — e da `workout-adjust.tsx`, personalizzazione Open 27.3, che eredita il fix senza modifiche proprie).
- **Fix:** entrambe ora mostrano la riga **raw** (`l.trim()`, esattamente ciò che il coach ha scritto) invece di `lineLabel(l)`. Rimossa `lineLabel()` da `lib/workout.ts` (dead code, nessun altro consumer). Il chip colorato di zona (Z1–Z5/NM) resta — non è "il tag stile", è l'indicatore visivo già presente prima.
- **Non toccata `sigLabel()`** (`lib/workout.ts`): serve la curva di efficienza (Onda 16), un'etichetta di grafico aggregata, non il render riga-per-riga — fuori dallo scope di questo task.
- `npx tsc --noEmit` verde. `npx eslint` pulito. `npm test`: 28/28 verdi.

### 29.4 — Via il +/- percentuale, sostituito da "Chiedi una modifica"
- **Rimosso il self-scaling Onda 27.3** (riduci/standard/aumenta sul volume, solo Canale Open): `components/workout/workout-adjust.tsx`, `app/app/nuoto/adjust-actions.ts`, e da `lib/workout.ts` i simboli `AdjustDirection`/`ADJUST_FACTOR`/`scaleBlocks` — nessun altro consumer nel repo (verificato).
- **Nuovo:** `components/workout/request-change.tsx` (`RequestChangeButton`) — bottone "Chiedi una modifica" su ogni seduta in `app/app/nuoto/[id]/page.tsx` (ora per **tutti** i kind, non solo Open — prima il self-scaling esisteva solo per Open, ma "chiedere una modifica" è utile anche su una scheda 1:1 personale, che anzi ne ha più motivo). Apre una nota libera (max 500 caratteri), invio con `app/app/nuoto/request-actions.ts` → `requestWorkoutChange`.
- **Nessuna scrittura su `workouts`** (ADR-001): l'azione fa **solo** `notifyCoaches("richiesta", …)` (nuovo `NotifType` — `lib/notify.ts`/`lib/notifications.ts`, emoji 💬) col titolo dell'allenamento + la nota del nuotatore, e un evento ledger **senza testo libero** (`workout.change_requested { workout_id }`, coerente con la regola "mai testo libero nel ledger" — vocabolario aggiornato in `migration_001_activity_ledger.sql`, nessuna nuova migration, `activity_events.type` è testo libero per convenzione).
- **Copy di conferma esatto, non riscritto:** GLIDE_VOICE.md §5 — *"L'allenamento lo scrive Alessio. Gli inoltro la richiesta."*
- **Nota aperta (non decisa qui):** `docs/GLIDE_ADR.md` è passata da ADR-001..005 a ADR-007..011 — **non esiste un ADR-006**. Alcuni commenti nel codice citano "ADR-006 §4" (indice readiness nascosto al nuotatore) come se esistesse: verificato che il vincolo che descrivono è comunque rispettato nel codice (il nuotatore non vede `readiness_fisica/mentale`), ma la numerazione ADR-006 non è in `GLIDE_ADR.md` — probabilmente un ADR scritto altrove o mai trascritto. Non toccato, fuori scope.
- **Nota aperta anche qui (come in 29.2):** la sezione "Preferenze" del coach su `/coach/open` (Onda 27.2) legge ancora `activity_events` tipo `workout.adjusted` per "quante volte gli iscritti hanno scelto di ridurre/aumentare" — con la feature rimossa quello storico **non crescerà più** (resta solo lo storico fino ad oggi). Non toccata quella sezione: non era nella richiesta, e decidere se toglierla/sostituirla è una scelta di prodotto.
- `npx tsc --noEmit` verde. `npx eslint` pulito. `npm test`: 28/28 verdi.

### 29.5 — Builder allenamento self-service, Canale Open (ADR-012)
- **`docs/GLIDE_ADR.md` non ha un ADR-012** (l'ultimo è ADR-011): la richiesta lo cita come se esistesse già. Trattato come una decisione presa fuori da questa sessione (dal titolare, nel testo del task) e **non scritta** nel documento — non l'ho aggiunta io: modificare `GLIDE_ADR.md` è un binario diverso da questa sessione di codice. Segnalato qui come nota, non bloccante (non rientra nei 3 casi di stop espliciti).
- **`migration_037_workouts_self_kind.sql`** (numerata 037, non 036: quel numero è già preso da una migration in un altro branch/PR ancora non mergiato — evitata la collisione). **Pre-check fatto prima di scrivere la migration**: letto lo schema live via Supabase MCP — `workouts_kind_check` esiste esattamente com'è nel task (`ARRAY['personal','open_channel','template']`), la policy `"workouts: lettura"` esistente **già** copre il self in SELECT (`OR swimmer_id = auth.uid()`, qualunque kind) → nessuna nuova policy SELECT necessaria, coerente col task. **APPLICATA** via Supabase MCP: `alter constraint` + 3 policy nuove (insert/update/delete, scoped `kind='self' AND swimmer_id=auth.uid()`; l'update ha lo scoping **sia in `using` sia in `with_check`**, per bloccare un update che smuggla `kind`/`swimmer_id` fuori dal self proprio).
- **TEST OBBLIGATORIO — eseguito LIVE sul DB reale** (non simulato), impersonando due nuotatori distinti via `select set_config('request.jwt.claims', …, true); set local role authenticated;` dentro una transazione, poi rollback/cleanup verificato (righe di test rimosse, conteggio 0 residuo):
  1. Nuotatore A inserisce `kind='self', swimmer_id=A` → **200/riuscito** ✅
  2. Nuotatore A tenta `kind='open_channel'` → **42501 RLS violation** ✅ (richiesto: deve fallire)
  3. Nuotatore A tenta `kind='self', swimmer_id=B` (altrui) → **42501 RLS violation** ✅ (richiesto: deve fallire)
  4. Nuotatore B tenta UPDATE sulla riga self di A → **0 righe toccate** (bloccato da `using`) ✅
  5. Nuotatore A tenta di promuovere la propria riga a `kind='open_channel'` via UPDATE → **42501** (bloccato da `with_check`) ✅
  6. Nuotatore A aggiorna legittimamente la propria riga (titolo) → **riuscito** ✅
  7. Nuotatore B tenta DELETE sulla riga di A → **0 righe toccate** ✅
  8. Nuotatore A elimina legittimamente la propria riga → **riuscito**, cleanup verificato (count=0) ✅
  **Esito: 8/8 come atteso.** Test strutturale di regressione aggiunto anche in `test/security/workouts-self-kind.sql` (stesso stile di `role-lock.sql`: verifica che constraint+policy esistano con lo scoping giusto — l'impersonazione resta questo giro live, documentato qui).
- **`coach_id` è NOT NULL sullo schema** (non menzionato nel task): un insert self-service deve comunque risolvere il coach unico del modello single-coach (ADR-002). Risolto **server-side con l'admin client** (lookup read-only `profiles where role='coach'`, MAI hardcoded lato client — ADR-002 regola 1) dentro `app/app/nuoto/self-actions.ts`; la scrittura vera e propria passa comunque dal client RLS-rispettoso del nuotatore (non dall'admin), così la policy nuova è davvero quella che gate-a.
- **UI (`components/workout/self-editor.tsx`, `SelfWorkoutManager`)**: editor **semplificato**, non l'editor coach — un blocco solo, niente picker zone/attrezzi/multi-blocco; riusa **`parseLine`** per l'anteprima live e la zona del blocco (dedotta dal token `Z3`/`NM` scritto nella riga, come fa già il coach). Etichetta netta **"Il tuo allenamento"** (`.t-label` + icona), card a bordo tratteggiato turchese — visivamente distinta dalle card coach (coerente col Task 1). Sezione nuova su `/app/nuoto` ("Il tuo allenamento"), **gated `canAccess(tier, "open:self")`** — nuovo resource in `lib/access.ts`, matrice `["open","open_plus"]`, stesso schema esistente (UNICO punto di gating). Controllo **ripetuto server-side** in `createSelfWorkout` (non solo UI).
- **Non nel Canale Open pubblico:** già vero per costruzione — tutte le query di `/coach/open`, `/app/nuoto` (settimana), `/app/nuoto/archivio` filtrano esplicitamente `kind='open_channel'`; il self-service non ci compare senza bisogno di nuovi filtri.
- **Non conta come aderenza nel Glide Score — fatto ciò che è fatto strutturalmente, con un limite onesto:**
  - `readiness-actions.ts`: `workout_completions.source` ora distingue **`'self'`** (prima ricadeva su `'personal'` per qualunque kind ≠ open_channel — un bug latente che questa migration avrebbe attivato subito se non corretto qui).
  - `coach/nuotatori/[id]/page.tsx` "Riepilogo Open": aggiunto `.eq("source","open_channel")` alla query dei completamenti — senza, i self-workout avrebbero gonfiato "svolti/metri totali" mostrati al coach.
  - **Limite onesto, non risolvibile qui senza una modifica più ampia:** `lib/score/compute.ts` (Onda/aderenza/Glide Score) legge **solo `activity_events` readiness.pre/post**, mai `workouts.kind` né `workout_completions.source` — un check-in pre→post già conta per l'Onda **indipendentemente dal workout collegato** (anche oggi, senza self-service, un check-in senza alcun workout_id già conta). Il self-service **non apre un varco nuovo**: non peggiora nulla che non fosse già vero, ma non è nemmeno "escluso" nel senso stretto di un filtro dedicato nel calcolo dell'Onda — richiederebbe ripensare cosa misura l'Onda, fuori scope qui. Segnalato, non deciso.
- **Etichette contestuali aggiornate** (per non far sembrare un self-workout "scritto da Alessio", ADR-001): il picker del check-in (`readiness/checkin.tsx`) ora dice **"Tuo"** invece di "Scheda" per i workout self; la sezione "Feedback post-allenamento" del coach (`coach/nuotatori/[id]/page.tsx`) dice **"Suo (self-service)"**.
- **`RequestChangeButton`** (Onda 29.4) **non compare** su un allenamento `kind='self'` in `/app/nuoto/[id]` — non ha senso chiedere ad Alessio di modificare qualcosa che il nuotatore ha scritto lui stesso (si modifica/elimina da `/app/nuoto`, `SelfWorkoutManager`).
- `npx tsc --noEmit` verde. `npx eslint` pulito. `npm test`: 28/28 verdi. `next build`: compila, si ferma solo sulle env Supabase mancanti nel sandbox (stesso pattern di sempre, nessun errore di codice).

## 🔓 migration_035 — scope pubblico anon su `marketing.leads`/`marketing.test_results` (21 ago, modalità autonoma)

- **Contesto:** l'audit di ieri (S-0 bis) aveva trovato queste due tabelle "fantasma" (origine esterna, non create da nessuna migration del repo) con RLS attiva ma **zero policy e zero grant** per `anon` — deny-all totale, lasciato come domanda aperta ("da chiarire con te"). Richiesta esplicita di oggi: aprire **solo la scrittura minima** (form pubblico di lead/quiz), mai la lettura.
- **Pre-check (come richiesto) prima di applicare:** riverificato via query dirette — `relrowsecurity = true` su entrambe, **zero righe in `pg_policies`**, **zero righe in `information_schema.role_table_grants`** per `anon`/`authenticated`/`public` sullo schema `marketing`. Nessuna policy preesistente da duplicare o contraddire: confermato quanto diceva l'audit di ieri.
- **`migration_035_marketing_anon_scope.sql`** applicata via Supabase (ledger `20260821143252`): `grant usage` sullo schema + `grant insert` (solo insert) su entrambe le tabelle ad `anon`; due policy `for insert to anon with check (true)`. Nessun `select`/`update`/`delete` concesso.
- **Test reale con la anon key** (via REST, non simulato): `INSERT` su `marketing.leads` e `marketing.test_results` → **201** su entrambe; `SELECT` su entrambe → **401** (`42501 permission denied`, nessun grant select); `UPDATE` → **401** allo stesso modo. Nota tecnica: un `INSERT` con `Prefer: return=representation` fallisce anch'esso con 401 perché il `RETURNING` richiede privilegio `SELECT` sulle colonne — comportamento corretto e atteso per un client write-only (deve usare `return=minimal`). Righe di test create durante la prova **rimosse subito dopo** con la service_role (marcate con un identificatore univoco, verificato conteggio 0 residuo).

## 🔧 Ledger migration 025/026 + fix fallimento silenzioso webhook Stripe (21 ago, modalità autonoma)

- **Drift ledger 025/026 chiuso.** `migration_025_perf_indexes_rls.sql` e `migration_026_lesson_buffer_zero.sql` erano già applicati sul DB live (riverificato: indice `workout_completions_workout_idx` presente, policy `workouts: lettura` già riscritta con `(select …)`, `services.buffer_min` tutti a 0 — coerente con la ricognizione S-0 (bis) qui sotto) ma assenti da `supabase_migrations.schema_migrations`. **I due file non richiedevano modifiche** (già fotografia esatta dello schema live, nessun ALTER scritto): aggiunte solo le **due righe di tracciamento** nel ledger (version `20260721101000`/`20260721101500`, tra 024 e 027; `created_by` marcato esplicitamente come backfill di ledger, per distinguerlo da un'esecuzione reale). **Nessuna DDL ri-eseguita sul DB.** `list_migrations` ora conta 33 righe tracciate; **`023` resta l'unico file davvero pendente** (non toccato, per indicazione esplicita).
- **Webhook Stripe (`src/app/api/stripe/webhook/route.ts`, branch `season` ~103-130) — fallimento silenzioso corretto.** L'`update` di `profiles` (1:1 stagionale) ignorava l'errore restituito. Ora: legge `{ error }`, se presente **logga strutturato** (JSON con `stripe_event_id`, `stripe_event_type`, `swimmer_id`, `error_code`, `error_message`) e **risponde 500 invece di 200**, così Stripe ritenta invece di segnare l'evento come gestito. **Non toccata la colonna `tier_expires_at` né applicata `migration_023`** (resta in sospeso, per indicazione esplicita): finché 023 non è applicata, quell'update continuerà a fallire realmente in produzione per ogni acquisto 1:1 stagionale — ma ora **in modo rumoroso** (log + retry Stripe), non più silenzioso. Effetto pratico: **oggi un pagamento 1:1 stagionale reale non andrebbe a buon fine finché 023 non viene applicata** (era già vero prima, ora almeno si vede).
- **Test aggiunto** (`src/app/api/stripe/webhook/route.test.ts`, `node:test`, nessuna libreria di mocking esterna): simula l'errore reale (`42703`, colonna assente — lo stesso motivo per cui fallirebbe oggi in produzione) con un fake `fetch` sulle chiamate REST di supabase-js → verifica risposta `500` + un solo log strutturato con l'`event.id` corretto + nessun `transactions.insert` (niente transazione "succeeded" se il tier non si è sbloccato). Un secondo test copre il percorso positivo invariato (200, nessun log, transazione registrata).
- **Nota infrastrutturale (necessaria per far girare il test):** `server-only` (usato da `lib/stripe.ts`/`lib/supabase/admin.ts`) non era una dependency reale — solo l'alias interno di Next la copriva in dev/build; fuori da Next (test runner) il resolve falliva sempre. Aggiunta come dependency esplicita e lo script `test` ora passa `--conditions=react-server` a `tsx` (condizione standard per cui `server-only` risolve al suo stub vuoto). Anche `npm install` è stato completato: mancavano pacchetti nel checkout locale, incluso `tsx` stesso (lo script `test` non partiva).
- `npx tsc --noEmit` verde. `npm test`: **28/28 verdi** (26 preesistenti + 2 nuovi). `npx eslint` sui file toccati: pulito.

### ✅ Collaudo
- Ledger: `list_migrations` (progetto `unsdbeliaunhhgnuefyz`) → 025 e 026 presenti tra 024 e 027, nessun drift residuo per loro; 023 ancora assente (atteso).
- Webhook: `npm test` → simulato il fallimento dell'update → risposta non-200 (500) + log strutturato verificato via assert; percorso di successo verificato invariato.

## 🔒 S-0 (bis) — ricognizione sicurezza, nessun fix (21 ago)
- Richiesta: verificare stato migrazioni/RLS/webhook/bucket/env secondo i 7 punti di S-0, **solo
  lettura**, scrivere tutto in `SECURITY_AUDIT.md` senza applicare fix.
- **Tutto scritto in `SECURITY_AUDIT.md`** (nuova sezione in cima, storico precedente del 28 lug
  preservato sotto). Riassunto: RLS attiva su tutte le tabelle; nessuna escalation di ruolo
  possibile (trigger + policy, verificato live); webhook Stripe firma su raw body, corretto;
  bucket video/library/medical tutti privati; nessun segreto dietro `NEXT_PUBLIC_`; nessun
  `migration_003_tenancy`/`coach_id` (modello coach-unico confermato).
- **2 drift trovati (novità rispetto al giro di luglio), nessuna azione presa:**
  `migration_023_pricing_cron.sql` è nel repo ma **non applicata** al DB live (`tier_expires_at`
  assente, `pg_cron` non installato) — il webhook Stripe già scrive quella colonna nel branch
  "season", quindi un pagamento 1:1 stagionale reale oggi non setterebbe il tier; e due tabelle
  live (`marketing.leads`, `marketing.test_results`) non presenti in nessuna migration del repo
  (RLS attiva senza policy, quindi non aperte, ma non tracciate). Entrambi da confermare con
  Alessio prima di qualunque fix.
- Nessun codice toccato, nessuna migration applicata, nessuna configurazione Supabase toccata —
  coerente coi vincoli di sessione.

## 💶 VERSIONE DI PROVA — prezzi rimossi dalla pagina Abbonamenti (19 ago)
- **Decisione del titolare:** siamo in fase di test, quindi la pagina `/app/abbonamenti` **non mostra più i prezzi** delle carte Open/Open+/1:1 Mensile/Stagionale.
- **`components/pricing/pricing-card.tsx`**: `price`/`period`/`saving` diventati **opzionali** (renderizzati solo se presenti) — nessuna riga vuota al posto del prezzo.
- **`app/app/abbonamenti/page.tsx`**: rimossi i prop `price`/`period`/`saving` dalle 4 `PricingCard` (Open, Open+, Mensile, Stagionale); rimossa la tagline "Meno di un caffè ad allenamento" (riferimento implicito al costo). Aggiunto un avviso `Card` — "Versione di prova: i prezzi non sono ancora attivi." Il resto della pagina (feature, CTA, checkout Stripe/simulato, tier attuale) **invariato**: solo la visualizzazione del prezzo è stata tolta, non il flusso di attivazione.
- **Non toccato**: Stripe/env (`STRIPE_PRICE_*`), altri importi in app (sblocco video €5, lezioni extra a pagamento, incassi coach) — sono pagamenti diversi dagli abbonamenti, fuori dalla richiesta.
- `npx tsc --noEmit` verde. `npm run lint`: nessun nuovo errore (i soliti 3 pre-esistenti non toccati).

## 📄 PRIVACY / GDPR — bozze legali archiviate in `docs/legal/` (18 ago)
- Archiviate le **5 bozze di lavoro** prodotte sul binario umano (non da Code, coerente col vincolo del 30 lug): `GLIDE_INFORMATIVA_PRIVACY.md`, `GLIDE_CONSENSI.md`, `GLIDE_DPIA.md`, `GLIDE_DATA_BREACH_PROCEDURE.md`, `GLIDE_LAUNCH_PRIVACY_READINESS.md` — tutte in `docs/legal/`, ciascuna già marcata **BOZZA** con i propri segnaposto `[DA COMPLETARE]` e nodi `⚖️` da far validare da un privacy lawyer/DPO.
- **Nessun contenuto legale scritto o modificato da Code** in questa sessione: solo spostate le bozze fornite dal titolare nella destinazione già indicata nell'header di ciascun file. Restano bozze **non pubblicabili** finché non validate.
- Confermato lo stato dei gap 🔴 mandatory pre-lancio (da `GLIDE_LAUNCH_PRIVACY_READINESS.md`): consenso esplicito art. 9, informativa, DPIA, registro trattamenti, DPA fornitori, mappa trasferimenti — tutti ancora da chiudere sul binario umano prima che si possa sbloccare `migration_004_consents`.
- **Prossimo passo NON codice invariato:** validazione legale/DPO dei testi, poi firma DPIA (§6), poi si sblocca la migration dei consensi.

## 🌊 ONDA 28 — Agenda leggibile + Social: riepilogo contenuti e feedback settimanale (branch `claude/agenda-social-improvements-h9b8r6`)

### 28.1 — Agenda: "Finestre attive" raggruppate (usabilità)
- **Sintomo segnalato:** quando la stessa finestra ricorrente viene duplicata su più giorni (`duplicateRuleAllWeek` o inserimento manuale), l'elenco "Finestre attive" mostrava **una riga identica per ogni giorno** — dispersivo, richiede più occhiate per capire cosa cambia davvero.
- **`lib/availability.ts`** (nuovo, puro): `groupAvailabilityRules(rules)` raggruppa le regole con **stesso orario+passo+modalità+etichetta** in un'unica riga; `groupIds` per l'eliminazione in blocco; `WEEK_DISPLAY_ORDER` (lun→dom) per la visualizzazione, indipendente dalla convenzione DB (0=Dom…6=Sab).
- **`coach-agenda.tsx`**: la card "Finestre attive" ora mostra **una riga per gruppo** — se copre un solo giorno, badge singolo com'era prima; se ne copre più di uno, **7 chip lun→dom** (piene per i giorni coperti, tratteggiate per gli assenti). **Cliccare una chip rimuove solo quel giorno** dal gruppo (riusa `deleteRule`); **"Elimina tutte (N)"** toglie l'intero gruppo in un colpo (nuova azione `deleteRules`, bulk `delete...in(ids)`); "Duplica su tutta la settimana" resta disponibile finché il gruppo non copre già tutti i 7 giorni.
- **Nessuna migration**: solo raggruppamento client-side sui dati già letti da `availability_rules`; nessuna colonna nuova, nessun cambio di RLS.

### 28.2 — Social: riepilogo contenuti visualizzati + idee per i prossimi post + feedback settimanale atleta
- **`migration_034_weekly_feedback.sql`**: nuova tabella **`weekly_feedback`** (swimmer_id, week_start, rating 1–5, topics text[], note, **unique swimmer+settimana** → upsert). RLS: il nuotatore legge/scrive/aggiorna la propria riga, il coach legge tutto (aggregato, mai per nome fuori dalla scheda). Niente policy delete (resta un fatto storico, come readiness).
- **`lib/feedback.ts`**: vocabolario chiuso `FEEDBACK_TOPICS` (tecnica/allenamento/gare/alimentazione/mentale/recupero/materiali) + ancore del punteggio 1–5.
- **App atleta — proposta settimanale non invasiva** (`components/feedback/weekly-feedback.tsx` + `app/app/feedback-actions.ts`): una card in home ("Come è andata questa settimana?"), **mai un popup**, **saltabile senza conseguenze** (torna la settimana dopo — nessuno stato "rifiutato per sempre" persistito), compare solo se il nuotatore **non ha già risposto per la settimana corrente** (query su `weekly_feedback`, come il pattern del prompt "com'è andata la seduta?" del check-in). Punteggio 1–5 con ancore + chip multi-select "cosa vorresti approfondire" + nota libera facoltativa. Upsert (può correggersi). Ledger fail-soft `feedback.weekly {week_start, rating, topics, has_note}` — **la nota resta fuori dal ledger**, stesso pattern del "una nota per Alessio" post-sessione (ADR-004).
- **Tracciamento apertura Libreria** (`app/app/libreria/[id]/open/route.ts`): dopo il gate tier, `logEvent(..., "library.opened", {item_id})` fail-soft — prima non esisteva alcuna traccia di cosa gli atleti aprono davvero in Libreria.
- **`/coach/social`** — nuova sezione **"Riepilogo contenuti & idee per i prossimi post"** (`components/social/content-insights.tsx`, fase di test): **contenuti Libreria più aperti** (da `library.opened`), **focus Canale Open più scelti** (da `workout_completions`, stessa fonte di 27.2), **argomenti più richiesti** dal feedback settimanale (chip aggregate), **umore medio settimanale + tasso di risposta**, **ultime note** — tutto in aggregato, coerente con "Preferenze" di 27.2 (mai il nome del singolo qui).
- **Vocabolario ledger aggiornato** (`migration_001_activity_ledger.sql`, solo commento — additivo, nessuna DDL ri-eseguita): `library.opened`, `feedback.weekly`.

### ✅ Collaudo
- **28.1**: duplica una finestra su tutta la settimana → compare **una riga** con 7 chip piene; clic su una chip → sparisce solo quel giorno (torna a 6 chip); "Elimina tutte" toglie il gruppo intero in un colpo.
- **28.2**: da atleta, apri un contenuto Libreria → il coach vede il conteggio in "Contenuti Libreria più aperti". Rispondi al feedback settimanale (voto + almeno un argomento) → compare in "argomenti più richiesti" e nelle ultime note su `/coach/social`; riapri l'home nella stessa settimana → il prompt non ricompare (già risposto).
- `npx tsc --noEmit` verde. `npm run lint`: nessun nuovo errore/warning (i 3 pre-esistenti — `app/page.tsx` Date.now, `assistant-widget.tsx`, `home-greeting.tsx` — non toccati in questa sessione). `next build`: si ferma solo sulle env Supabase mancanti nel sandbox, nessun errore di codice — stesso pattern delle onde precedenti.

### 🗄️ Migrazione da applicare al deploy
- **`migration_034_weekly_feedback.sql`** — additiva, nuova tabella + RLS, nessun dato esistente toccato.

### 🔮 Non fatto in questa onda (rinviato)
- **Vista settimanale a griglia** per l'agenda (calendario visivo lun→dom con le fasce come blocchi): il raggruppamento in 28.1 risolve il sintomo segnalato (ripetizione) con una modifica minima e senza rischio; una griglia vera è un cambio di layout più ampio, da valutare se il raggruppamento non bastasse all'uso reale.
- **Analytics sui post pubblicati** (like/commenti/reach da Instagram/TikTok/YouTube): richiederebbe le API dei singoli social (OAuth, token, sync) — fuori scala per questa onda. Il riepilogo 28.2 lavora solo sui **segnali che GLIDE già possiede** (aperture Libreria, focus Open, feedback atleta), che è quanto un coach singolo può leggere senza integrazioni esterne.

## 🌊 ONDA 27 — Feedback post-allenamento al coach + preferenze e personalizzazione Canale Open (branch `claude/workout-feedback-open-personalization-mntmss`)

### 27.1 — Bug chiuso: la nota del check-in post non arrivava mai al coach
- **Scoperto in sessione:** il nuotatore scrive già una nota libera al post-sessione ("Una nota per Alessio", `readiness.note` — esiste da `migration_002_readiness_v2`), ma `v_readiness` — l'UNICA fonte letta dal coach — non la esponeva mai, e nessuna UI la mostrava. Da quando esiste il check-in v2, **ogni nota scritta è stata raccolta ma mai vista da nessuno.**
- **`migration_033_readiness_note_coach.sql`** (additiva, `create or replace view`): espone `note as nota` + `workout_id` in `v_readiness`. Nessuna nuova colonna, nessun nuovo dato raccolto — solo si smette di scartarlo in vista.
- **Scheda coach nuotatore:** nuova sezione **"Feedback post-allenamento"**, sempre visibile (non più solo per tier `open`/`open_plus`) — copre esplicitamente **sia 1:1 sia Canale Open**, perché la nota/RPE/umore arrivano dallo stesso check-in a prescindere dal tipo di scheda. Ogni riga: data, RPE, umore, **titolo e fonte dell'allenamento** (Scheda/Open, via join su `workouts`), **testo integrale della nota** se presente. La vecchia lista "Ultimi feedback" dentro "Riepilogo Open" (Onda 25, solo RPE/umore) è stata assorbita da questa sezione per non duplicare.

### 27.2 — Canale Open: statistiche di preferenza (coach, fase di test)
- Nuova sezione **"Preferenze"** in `/coach/open`, in aggregato (mai per nome — quello resta nella scheda del nuotatore):
  - **Tasso di scelta — settimana corrente**: per ogni allenamento pubblicato, quanti iscritti Open l'hanno svolto su quanti hanno accesso (`profiles.tier in (open, open_plus)`), in %.
  - **Focus più scelti** (tutte le settimane): distribuzione dei focus da `workout_completions` (`source='open_channel'`), i primi 6 per conteggio.
  - **Personalizzazione volume**: quante volte gli iscritti hanno scelto di ridurre/aumentare (27.3), da `activity_events` tipo `workout.adjusted`.
- Nessuna nuova tabella: solo aggregazioni su dati già raccolti (`workout_completions`, `activity_events`, `profiles.tier`).

### 27.3 — Personalizzazione dell'allenamento Open (autoregolazione del volume)
- **Decisione scientifica (autoregolazione via RPE):** si modula il **VOLUME** (numero di ripetizioni/giri, `rounds`), MAI l'intensità/passo/zona — cambiare l'intervallo o la zona snaturerebbe lo stimolo prescritto dal coach, mentre variare il numero di ripetizioni dello stesso set preserva il tipo di lavoro (stessa logica delle metodiche di autoregolazione a RPE in letteratura — es. session-RPE di Foster, protocolli APRE nello strength training). **Percentuali scelte in modo prudente e asimmetrico**: **−15%** in riduzione, **+10%** in aumento (si concede più margine a scendere che a salire, per non incentivare un sovraccarico auto-gestito senza supervisione); minimo 1 giro per blocco.
- **`lib/workout.ts`**: `scaleBlocks(blocks, direction)` + `ADJUST_FACTOR`. Pura funzione di visualizzazione: **non tocca mai la scheda del coach**, è solo la vista del nuotatore che cambia.
- **`/app/nuoto/[id]`** (solo `kind='open_channel'`): 3 pulsanti "Riduci un po' · Come indicato · Aumenta un po'" (`components/workout/workout-adjust.tsx`) che ricalcolano blocchi e metri al volo. **Suggerimento basato sul feedback**: se l'ultimo RPE post-sessione del nuotatore è ≥8 (fatica alta) compare un invito non vincolante a valutare la riduzione; se ≤3 (troppo facile) a valutare l'aumento — **niente indice nascosto mostrato**, solo il proprio RPE che il nuotatore ha già dichiarato (non viola ADR-006 §4, che riguarda gli indici derivati readiness_fisica/mentale, mai l'RPE auto-riportato).
- La scelta (se diversa da "standard") viene loggata fail-soft nel ledger (`workout.adjusted { workout_id, direction }`, nuovo tipo in `lib/ledger.ts` — vocabolario aggiornato in `migration_001_activity_ledger.sql`, nessuna nuova migration: `activity_events.type` è testo libero per convenzione, non CHECK) → alimenta 27.2.
- **Non fatto in questa onda (rinviato):** derivare un fattore di personalizzazione DEFAULT dal `livello` calcolato in intake — scartato apposta: il livello è **solo del coach** (ADR-006), mostrarlo o usarlo per pre-selezionare un pulsante al nuotatore violerebbe l'invariante. L'autoregolazione resta scelta esplicita del nuotatore, non calcolata.

### ✅ Collaudo
- **27.1**: da atleta, scrivi una nota al post-sessione (1:1 o Open) → il coach la vede integralmente in scheda, con titolo/fonte dell'allenamento.
- **27.2**: su `/coach/open`, verifica che le percentuali di scelta e i focus più scelti compaiano con almeno un paio di completamenti a DB.
- **27.3**: da atleta Open, apri un allenamento della settimana → i 3 pulsanti ricalcolano giri e metri senza toccare passo/zona; scegliendo riduci/aumenta compare il log lato coach in "Preferenze".
- `tsc --noEmit` verde. `next build`: stop solo su env Supabase mancanti nel sandbox (nessun errore di codice) — coerente coi precedenti.

### 🗄️ Migrazione da applicare al deploy
- **`migration_033_readiness_note_coach.sql`** — additiva, `create or replace view` (nessun downtime, nessun dato nuovo).

## 🌊 ONDA 26 — Certificato medico: minimizzazione (branch `claude/onda-26-medcert`)
- **Decisione del titolare (GDPR, minimizzazione Art. 5(1)(c)):** del certificato medico si conserva **solo la scadenza + un flag di validità autodichiarato**. Il documento **non si carica e non si archivia più**.
- **`migration_032_medcert_no_file.sql`** (non distruttiva): `file_key` → nullable/deprecato, aggiunto `dichiarato boolean`. Bucket `medical` e righe storiche **non toccati** (la purga dei PDF già caricati è uno step manuale separato, non eseguito: cancellare dati sanitari è irreversibile e va confermato).
- **UI atleta:** l'uploader diventa **autodichiarazione** (`certificate-declaration.tsx`): data di scadenza + checkbox "dichiaro di possedere un certificato valido", nessun file. Rimossi i link "Apri" (atleta) e "Apri documento" (coach) e le due route `.../certificato` che servivano il file firmato.
- Sync `profiles.cert_status/cert_expiry` invariato (digest/scheda/elenco continuano a funzionare). `tsc` verde.
- **Aggiornata `GLIDE_DATA_MAP.md`:** riga certificati + G9 (da "Aperto" a "Parziale — deciso go-forward").

## 🔐 PRIVACY / GDPR — binario aperto (30 lug)
- **`GLIDE_DATA_MAP.md`** (nuovo): inventario **tecnico** dei trattamenti ricavato dallo schema reale — tabella per tabella (dati, categoria, accesso RLS), bucket (`medical`, video), sub-responsabili (Supabase UE / Stripe / Resend / R2 / Vercel / LLM), flusso verso l'LLM, gap G1–G12. **Colonne legali (base giuridica, retention, DPIA) lasciate vuote di proposito** → decisione legale, non codice.
- Fatti chiave emersi: la chat assistente **non è persistita** (solo testo, nessuna tabella `messages`); `medical_certificates` archivia il **file** PDF (non solo la scadenza → nodo minimizzazione G9); `glide_scores` è **profilazione/scoring** → pesa sulla DPIA (G6).
- **Prossimo passo NON codice:** DPIA + testi consenso con un legale; poi si sblocca `migration_004_consents`. Vincolo confermato: informative/consensi/retention/DPIA non li tocca Code.

## 🌊 ONDA 25 — Riepilogo Open per il coach (branch `claude/onda-25`, PR #28 mergiata)
- Scheda coach del nuotatore (`/coach/nuotatori/[id]`), **solo tier `open`/`open_plus`**: sezione "Riepilogo Open" (fase di test) — 3 stat (svolti, metri totali, feedback post), **torta** del feedback post-sessione (RPE in fasce Facile 1–3 / Medio 4–6 / Duro 7–10) con RPE e umore medi, e lista degli ultimi 6 feedback.
- Dati da `workout_completions` e `v_readiness` (righe `rpe != null` = post). recharts **lazy** (`ssr:false`) via `open-recap-pie.tsx` → `open-recap-pie-impl.tsx` (pattern `revenue-chart.tsx`). **Nessuna nuova tabella, nessuna migration, nessun dato in più raccolto.** `tsc` + `next build` verdi. Preview Vercel Ready.

## 🔒 SECURITY — Baseline Step 1 · S-0 (branch `claude/security-baseline-s0`)
- **Setup AIOS Level 1**: creato `.aios/` (PROJECT · CURRENT_STATE · MEMORY · HANDOFF) + `PROMPT_CODE_SEC.md` e `GLIDE_SECURITY_AUDIT_v1.md` in root. **ADR-006 NON scritto** (hard-stop: attende OK).
- **S-0 (solo lettura) → `SECURITY_AUDIT.md`.** Esito: il repo è molto più avanti del modello dell'audit. **Già chiusi:** C-3 regione UE (`eu-central-1`), C-4 (nessun segreto in `NEXT_PUBLIC_`), C-5 (bucket video privato + signed URL), A-1 (tutte le tabelle RLS+policy), C-2 firma webhook Stripe (raw body + `constructEvent`). **Mitigato:** C-1 role escalation (trigger `protect_role_column` presente; manca solo il column-check in policy). **Aperti:** A-7 security headers (`next.config.ts` vuoto), idempotenza Stripe (`stripe_events`).
- **S-0.5 fermato al gate (STOP AIOS).** Motivi: (a) niente CLI Supabase → `db pull` non eseguibile; (b) ledger **già tracciato** 001→029 (non vuoto); (c) **`coach_id` NON esiste su `profiles`** (modello coach-unico `is_coach()`, non multi-tenant); (d) `migration_004_consents` non esiste in questo repo (il 004 è `backfill_ledger`).
- **Impatto su S-1:** la policy role-lock del runbook referenzia `coach_id` (assente) → riga omessa (modello coach-unico).
- **S-1 fatto ✅** — C-1: `migration_030` (policy congela `role` nel ramo self, sopra il trigger già presente). C-2: `migration_031` `stripe_events` + idempotenza nel webhook (la firma era già ok). Check SQL `test/security/*.sql` verdi. Gate umano: test manuale role-escalation, MFA coach, leaked-password, backup PITR.
- **S-4 fatto ✅** — Cron auth **fail-closed** (`src/lib/cron-auth.ts`, `cronAuthorized`) su digest + video-purge. Enforcement health router verificato: nessun percorso salta `classify`, verso l'LLM va solo il messaggio (mai nome). Test `cron-auth.test.ts` + `safety.test.ts`. Aggiunto runner test (`tsx`, `npm test`) → **26 test verdi**. Stato finale finding scritto in `SECURITY_AUDIT.md`.
- **S-3 fatto ✅** — Dependabot (`.github/dependabot.yml`, no bump major auto). **Digest coach → notifica**: l'email ora manda solo conteggi + "Apri GLIDE", niente più zone di dolore/readiness nel corpo (regola "email non contiene"). **Rate limit Upstash** (`src/lib/ratelimit.ts`, no-op senza env) su `/api/assistant` (20/min) e login/registrazione (10/min). Sentry assente → N/A. `npm audit`: 12 HIGH transitive di Next (`postcss`/`sharp`) → bump `next@16.2.12` **a parte e verificato** (Next modificato). Gate umano: impostare `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` su Vercel.
- **S-2 fatto ✅** — Security headers in `next.config.ts` (HSTS/nosniff/frame-DENY/referrer/permissions **enforced**; **CSP in Report-Only** per non rischiare i pagamenti). `scripts/rls-audit.sql` → 0 tabelle da sistemare (aggiunta policy deny-all a `stripe_events`). `scripts/check-secrets.sh` (guardia bundle) → verde. Bucket video già privato + signed URL 1h. Gate umano: verificare checkout Stripe sulla preview + violazioni CSP nei report prima di promuovere la CSP a enforcing.

## 🌊 ONDA 17 — Health-check per il lancio (branch `claude/onda-17`)
- **`/coach/stato`** (coach-only): schermata unica di controllo pre-lancio.
  - **Configurazione**: URL app, DB Supabase (connesso), **CRON_SECRET** (cron protetti sì/no), Stripe, webhook Stripe, Resend — semaforo verde/giallo/grigio (grigio = opzionale non attivo, ok per il test).
  - **Campo pronto**: conteggi nuotatori, programmi 1:1 attivi, Canale Open settimana corrente, libreria pubblicata, servizi prenotabili.
  - Voce **"Stato sistema"** nella sidebar coach (Panoramica). Copre i controlli tecnici della guida di lancio in un colpo d'occhio.
- **Nota lancio:** `CRON_SECRET` **impostata** su Vercel (verificato: `/api/cron/digest` → 401). Redirect URLs + Site URL già ok. Leaked-password = Pro (saltato). Resta operativo (tester + smoke test).



## 🌊 ONDA 16 — Personal best completi + booking a ruota (branch `claude/onda-16`)
- **Personal best su tutto il programma INDIVIDUALE (staffette escluse).** `lib/profile/costanti.ts`: `EVENTI_INDIVIDUALI` (SL 50→1500; dorso/rana/delfino 50/100/200; misti 100/200/400, con il **100 misti solo in vasca 25**) + `distanzeValide(stile,vasca)` + `isEventoIndividuale()`. Il selettore ora mostra **solo le distanze valide per lo stile scelto** (niente combinazioni inesistenti tipo 1500 rana o 50 misti). Validazione anche **lato server** in `upsertPersonalBest`.
- **Gestione PB anche dal Profilo (non solo in creazione):** nuovo `pb-manager.tsx` su `/app/profilo` → l'atleta aggiunge/aggiorna/rimuove i propri tempi quando vuole (upsert unico per distanza+stile+vasca). Il wizard di creazione usa lo stesso programma valido.
- **Passo 0 fra le lezioni (`migration_026`, APPLICATA):** `services.buffer_min` azzerato (le lezioni in vasca avevano 10 min) → prenotazioni **a ruota** (la successiva parte a fine della precedente). Default colonna già 0 per i nuovi servizi.
- **Duplica la settimana (agenda coach):** azione `duplicateWeekToNext` + pulsante in *Disponibilità* → copia le **aperture extra** (`availability_exceptions` kind 'extra') della settimana corrente su quella successiva (giorno+7), **idempotente** (salta i doppioni). Le finestre **ricorrenti** (`availability_rules`) si ripetono già da sole ogni settimana, quindi non vengono toccate.
- **Nuova zona NM · Neuromuscolare (forza/velocità):** aggiunta a `lib/workout.ts` (`ZoneId` + `ZONES`, colore viola #7C3AED) — **non codificata accademicamente**, fuori dalla scala aerobica Z1–Z5. Selezionabile nell'editor (il picker legge `Object.keys(ZONES)`), riconosciuta anche nella notazione riga (`… NM`), e trattata come set chiave nel `mainSetSig`. `blocks` è jsonb → nessun vincolo DB.



## 🌊 ONDA 15 — Auth locale per navigazione (branch `claude/onda-15`)
**Sintomo utenti:** lag "leggero ma ovunque", peggio alla prima apertura. **Causa:** ogni navigazione pagava ~2 chiamate di rete al server Auth — `getUser()` nel **middleware** (a ogni richiesta) + `getUser()` in **`getCurrentProfile()`** (a ogni pagina server) — più il **cold start** alla prima apertura.

**Intervento:**
- **Middleware** e **`getCurrentProfile()`** ora usano **`getClaims()`** (verifica del JWT **in locale**) invece di `getUser()` (round-trip di rete). Il refresh sessione resta gestito (getClaims → getSession interno). La sicurezza dei dati resta la **RLS**.
- **Nessuna regressione:** su chiavi legacy **HS256** `getClaims` ripiega su `getUser` (come prima); con chiavi **asimmetriche** la verifica è **locale** → −2 round-trip per navigazione.
- Gli altri `getUser()` (uploader video/certificato, reset password) restano: sono azioni rare, non per-navigazione.

**🔑 LEVA che sblocca il guadagno (manuale, Alessio):** in Supabase → **Auth → JWT / Signing Keys**, abilitare le **chiavi di firma asimmetriche** (migrazione dei token utente a ES/RS + pubblicazione JWKS). Da quel momento `getClaims` verifica **senza rete** e il lag "leggero ovunque" cala. Finché si resta su HS256, il codice è corretto e pronto ma il guadagno non si materializza.

**Cold start (prima apertura):** mitigabile con Vercel Fluid Compute (piano) o un warm-up schedulato; non incluso qui (cerotto, costo invocazioni) — da valutare se resta percepibile dopo l'abilitazione delle chiavi asimmetriche.



## 🌊 ONDA 14 — Performance (branch `claude/onda-14`)

### 14.1 — DIAGNOSI · PERF_BASELINE
**1. Lighthouse mobile** (home atleta / settimana Open / gestionale coach): ⚠️ **non eseguibile dal sandbox** (nessun browser verso il preview). Da catturare sul preview Vercel. Le cause misurabili sotto guidano comunque gli interventi.

**2. Regioni — 🔴 DISALLINEAMENTO (causa #1):**
- **Supabase:** `eu-central-1` (Francoforte, EU).
- **Vercel:** nessuna `region` in `vercel.json` → funzioni sulla **region di default** (tipicamente `iad1`, US-East). Ogni fetch SSR paga un round-trip **transatlantico** (~90–100ms) × più query sequenziali per pagina.
- **STOP GATE:** è una **modifica di configurazione**, non una migrazione (il DB non si sposta) → applicata: **`"regions": ["fra1"]`** in `vercel.json` (Francoforte, stessa zona del DB). Nessuno stop necessario.

**3. Query (pg_stat_statements):** le 10 query più costose sono **tutte di sistema/introspezione** (PostgREST schema cache, `pg_timezone_names`, dashboard/MCP). **Nessuna query applicativa** in classifica → a questo volume dati il layer query **non è un collo di bottiglia**.
- **FK senza indice:** 1 → `workout_completions.workout_id` (usata nella clausola RLS di `workouts` e nel FK). → indice in 14.2.
- **RLS `auth.uid()` per riga:** **41 policy** usano `auth.uid()`/`is_coach()`/`my_tier()` non avvolti in `(select …)` → rivalutati per riga. Impatto **attuale ~0** (poche righe), **latente a scala**. Advisor Supabase lo segnala. → riscrittura mirata in 14.2.

**4. Waterfall (await sequenziali indipendenti):** confermato per codice —
`coach/nuotatori/[id]` ~20 await, `app/profilo` ~10, `app` (home) ~7, `app/nuoto` ~5. Query indipendenti eseguite in serie → moltiplicano il RTT. → `Promise.all` in 14.2.

**5. Bundle (chunk client su disco):**
| Chunk | KB | Contenuto |
| --- | --- | --- |
| 433… | 518 | `@supabase` + **zod** (auth/env, quasi ovunque) |
| 129… / 03v… | 342 ×2 | **recharts** (già **lazy** da 13.1: chunk async, fuori dall'iniziale) |
| 3rxl… | 222 | react-dom (framework) |
| 0cz… / 2u… | 110 / 107 | runtime/app |
→ recharts già isolato ✅. Candidato: **zod nel bundle client** (via `env.ts`). Da valutare in 14.3.

### 🏁 CLASSIFICA cause per impatto (= ordine interventi)
1. **Regioni Vercel↔Supabase** (transatlantico su ogni query) — **FIX applicato (fra1)**.
2. **Waterfall** await sequenziali sulle pagine calde — `Promise.all` (14.2).
3. **Bundle iniziale** @supabase+zod (recharts già ok) — valutare zod (14.3).
4. **RLS `auth.uid()` per riga + indice FK** — preventivo scala (14.2).
5. **Skeleton/percepito** — grosso già fatto in 13.1; completare (14.5).

### 14.2 — DB e query (applicato)
- **`Promise.all`** sui 4 waterfall confermati: `coach/nuotatori/[id]` (~15 query indipendenti da serie → **2 ondate**; unita anche la doppia lettura `profiles`), `app/profilo` (6+ in parallelo, `profiles` letto una volta), `app` home (4), `app/nuoto` (3). Su rete EU (post-fra1) ogni query risparmiata è ~pochi ms, ma il **numero di RTT in serie crolla** → TTFB molto più basso.
- **`migration_025` (da applicare al deploy):** indice `workout_completions(workout_id)` (FK usata dalla RLS di `workouts`) + policy **`workouts: lettura`** riscritta con **initplan `(select …)`** su `is_coach()`/`my_tier()`/`auth.uid()`. Le altre policy `auth.uid()`-per-riga: **saltate ora** (impatto misurato ~0), rinviate a migrazione di manutenzione.

### 14.3 — Bundle client (applicato, misurato)
- **zod fuori dal bundle client.** `supabase/client.ts` importava `@/lib/env` (che esegue `zod.parse` a import) → zod finiva nel chunk `@supabase` caricato su OGNI pagina client-interattiva. Ora `client.ts` legge le `NEXT_PUBLIC_*` inlined + normalizza l'URL inline, **senza importare env**.
- **Misura chunk (raw KB):** chunk `@supabase` **518 → 240 KB** (`zod=0`), **−278 KB** sull'iniziale. recharts (341 KB ×2) già **async** (dynamic ssr:false, 13.1) → fuori dall'iniziale.
- **Saltato:** nessuna dipendenza duplicata/inutile emersa oltre a questa.

### 14.4 — Cache dati client — **SALTATO (con motivo)**
- I colli di bottiglia **misurati** erano server-side (regione + waterfall), **già risolti**. Il **Router Cache** di Next App Router serve già la **navigazione indietro senza refetch** (payload RSC in cache client). Il **prefetch dei Link** della nav è attivo di default in produzione.
- Introdurre **TanStack Query** = dipendenza + rearchitettura del layer dati non giustificata dalla diagnosi → **rinviata** a un'onda dedicata se il *percepito* lo richiederà. UI ottimistica idem (cambio ampio, nessun problema misurato). *Niente ottimizzazioni alla cieca (REGOLA DELL'ONDA).*

### 14.5 — Velocità percepita (applicato)
- **`loading.tsx` skeleton** aggiunti alle route con fetch ancora scoperte (agenda, lead, notifiche, social, videoanalisi, videoanalisi/[id], nuoto/[id], profilo/crea) → con i 16 di 13.1, **copertura completa** delle route che caricano dati. Il layout (nav/header) resta stabile mentre cambia il contenuto (lo skeleton vive dentro il layout di sezione).
- **Immagini/cover:** già in contenitori a proporzione fissa (nessun layout shift). `next/image` sulle cover libreria **rinviato**: sono URL firmati remoti (servirebbe `remotePatterns`), e non c'è CLS da correggere → non è un problema reale ora.

### 🏁 CHIUSURA — prima/dopo
| Dimensione | Prima | Dopo | Nota |
| --- | --- | --- | --- |
| **Region funzioni** | default (US, iad1) | **fra1 (EU)** | co-locate col DB eu-central-1 |
| **RTT in serie** (coach scheda) | ~15 sequenziali | **2 ondate** (Promise.all) | idem profilo/home/nuoto |
| **Chunk `@supabase`** | 518 KB (con zod) | **240 KB** | −278 KB, zod rimosso |
| **recharts** | — | async (fuori iniziale) | già 13.1 |
| **loading.tsx** | 16 route | **24 route** | copertura completa fetch |
| **Lighthouse (LCP/TBT/CLS/Perf)** | — | ⚠️ **da catturare sul preview** | non eseguibile dal sandbox |
- **Nessuna metrica peggiorata** (build verde; comportamento invariato, solo orchestrazione/bundle).
- **Da applicare al deploy:** `migration_025` (indice FK + RLS initplan).



## 🌊 ONDA 13 — Feedback utenti + Prezzi + Token 1:1 (2026-07-21 · branch `claude/onda-13`)

### 13.1 — Performance / lag fra le pagine
- **`loading.tsx` con skeleton su 16 route** (tutte quelle con fetch, atleta + coach): mai più schermo bianco durante la transizione. `components/ui/skeleton.tsx` (Skeleton + PageSkeleton).
- **Grafici recharts lazy** (`next/dynamic` ssr:false + skeleton): `readiness/chart.tsx` e `business/revenue-chart.tsx` spostati in `*-impl.tsx` e caricati fuori dal bundle iniziale / dopo il primo paint.
- **Prefetch**: i `<Link>` di tabbar atleta e sidebar coach prefetchano di default (Next App Router in produzione).
- **Fetch nei Server Components**: già la norma; il client riceve dati pronti.
- **Immagini**: cover libreria in contenitori a proporzione fissa (`aspect-[3/4]`, `h-16 w-16`) → nessun layout shift.
- **⚠️ Misure Lighthouse:** non eseguibili dal sandbox (niente browser verso il preview). **Da catturare sul preview Vercel** su home atleta / settimana Open / gestionale coach (prima/dopo). Interventi sopra mirati a TBT/LCP (meno JS iniziale) e CLS (skeleton + ratio fissi).

### 13.2 — Certificato medico (DATO SANITARIO)
- **`migration_022`**: `medical_certificates` + **bucket privato `medical`**. RLS: legge solo proprietario e coach; scrive/cancella solo il proprietario; storage limitato alla cartella-proprietario. File **solo via URL firmati brevi (300s)**; mai in liste/anteprime.
- **Atleta (Profilo)**: upload da fotocamera/galleria/PDF (`capture`), **compressione client >2MB** (canvas→JPEG), scadenza obbligatoria; semaforo + **promemoria non invasivo a 30gg**.
- **Coach (scheda)**: semaforo verde/giallo/rosso + apertura documento (route dedicata). Sync legacy `profiles.cert_status/cert_expiry`.

### 13.3 — Obiettivi multipli
- **`migration_021`**: `objectives` (gara|tecnica|benessere|evento, stato attivo|raggiunto|archiviato). **Nessuna percentuale/barra**. Migrati i goal singoli da `intake` (deprecato, non cancellato). RLS: nuotatore gestisce i propri, coach legge. Atleta gestisce dal Profilo; coach in scheda (sola lettura).

### 13.4 — Videoanalisi inclusa 1:1
- **`lib/access.ts`**: risorsa `video:review` → solo `one_to_one`. `registerVideo` include l'upload senza pagamento per il tier 1:1 (retro-compat `service_type`); gli altri restano sul flusso a pagamento. UI dedicata 1:1 senza riferimenti a costi; coda coach invariata.

### 13.5 — Prezzi definitivi + pagina /abbonamenti
- **Prezzi via env (mai hardcodati):** Open **12,90**, Open+ **19,90**, 1:1 mensile **79** (`STRIPE_PRICE_ONE_TO_ONE_MONTHLY`), 1:1 stagionale **690 one-off** (`STRIPE_PRICE_ONE_TO_ONE_SEASON`, valido fino a fine giugno).
- **Webhook**: 1:1 mensile → tier `one_to_one`; stagionale (one-off) → tier + `tier_expires_at`; cancellazioni → free.
- **`migration_023` (da applicare al deploy)**: `profiles.tier_expires_at` + **pg_cron `expire-seasonal-tiers`** giornaliero (stagionale scaduto → free).
- **Pagina `/app/abbonamenti`** a **coppie di carte** (Open|Open+, Mensile|Stagionale) + fascia free; **componente unico `PricingCard`**; **mobile 2 colonne affiancate**; brand sobrio (no urgency); `allow_promotion_codes` attivo. `UpgradeHint`/Profilo puntano qui.

### 13.6 — Token lezione 1:1
- **`migration_024`**: `lesson_tokens` (source mensile|coach; `redeemed_booking_id` unico). Funzioni **SECURITY DEFINER**: `grant_monthly_tokens` (**pg_cron 1/mese**, scade fine mese, no accumulo) + **reserve/link/release atomici** (`FOR UPDATE SKIP LOCKED` → niente doppio utilizzo). **Core (tabella+RLS+funzioni) APPLICATO**; lo **`cron.schedule` è nel file, da eseguire al deploy**.
- **Booking**: opzione `useToken` → reserve atomico, nessun pagamento, link alla prenotazione; release su fallimento. Atleta: "Usa il tuo token — lezione inclusa"; coach: saldo + "Regala token" (nota, non scade). `lesson_credits` (entitlement di piano) resta separato.

### 🔑 Variabili d'ambiente / prodotti Stripe da creare
- **Env nuove:** `STRIPE_PRICE_ONE_TO_ONE_MONTHLY`, `STRIPE_PRICE_ONE_TO_ONE_SEASON`. **Aggiornare** `STRIPE_PRICE_OPEN` (12,90) e `STRIPE_PRICE_OPEN_PLUS` (19,90).
- **Stripe Dashboard:** creare/aggiornare i 4 prezzi (12,90 / 19,90 mensili · 79 mensile · 690 one-off) e, se vuoi, i primi **Promotion Codes**.

### 🗄️ Migrazioni da applicare al deploy
- **`migration_023_pricing_cron`** (tier_expires_at + pg_cron) e la parte **`cron.schedule` di `migration_024`** (grant-monthly-tokens): applicare sul progetto (richiedono `create extension pg_cron`). Tabelle/funzioni core di 021/022/024 e RLS già applicate in questa sessione.

### ✅ Collaudo per sprint
- **13.2**: da telefono, carica un certificato con foto (verifica compressione) → semaforo verde; il coach apre il documento; a <30gg compare il promemoria.
- **13.3**: aggiungi 2 obiettivi, marcane uno "raggiunto" → il coach li vede in scheda.
- **13.4**: come 1:1 carica un video → nessun passaggio di pagamento; arriva nella coda coach.
- **13.5**: `/app/abbonamenti` — 4 carte affiancate su mobile; checklist allineate; codice promo nel checkout; acquisto **stagionale in test mode** → tier one_to_one con scadenza a fine giugno.
- **13.6**: prenota una lezione **spendendo il token** → prenotazione senza pagamento, token marcato usato; il coach regala un token e l'atleta lo vede.

## 🌊 ONDA 12 — Libreria + Tier di accesso (2026-07-21)

## 🌊 ONDA 12 — Libreria + Tier di accesso (2026-07-21)

### 12.1 — Modello dei tier di accesso
- **`migration_019` APPLICATA:** `profiles.tier` (free/open/open_plus/one_to_one, default free) + **guardia** `protect_tier_column` (un nuotatore NON può auto-promuoversi: consentito solo a coach/service_role — verificato). Helper `my_tier()` SECURITY DEFINER.
- **`lib/access.ts`** — UNICO punto di gating: `canAccess(tier, risorsa)` + **matrice ESPLICITA** (nessuna gerarchia implicita). Applicata **in UI** (nasconde/lucchetto) **e lato server/RLS** (rifiuta). **Test `lib/access.test.ts`: 57 asserzioni verdi** (verificate).
- **Enforcement DB:** RLS `workouts` riscritta — open vede solo la **settimana corrente**, open_plus **tutto lo storico**, free niente; **"ciò che ho svolto resta mio"** (clausola completions). Simulazione ruoli verde: `open=1 · open_plus=2 · free=0 · free+completion=1`.
- **Stripe:** prodotto **Open+** (`STRIPE_PRICE_OPEN_PLUS`, **non hardcodato** — prezzo deciso da Alessio). Webhook esteso: abbonamento attivo → tier; `customer.subscription.deleted/updated` (canceled/unpaid) → tier torna **free**. Non tocca mai un `one_to_one` (lo gestisce il coach).
- **Assegnazione:** il coach imposta il tier dalla scheda nuotatore. **Invito non aggressivo** `UpgradeHint` (una riga + pulsante, niente popup) ovunque ci sia contenuto bloccato.

### 12.2 — Sezione Libreria
- **`migration_020` APPLICATA:** `library_items` (pdf/video/link, `visibility` per tier, `published`, cover) + **bucket privato `library`** con policy coach. File letti **solo via URL firmati**.
- **Coach `/coach/libreria`:** upload da browser (PDF + cover), pubblica/nascondi, elimina, visibilità per tier.
- **Atleta `/app/libreria`:** griglia card. I contenuti di **tier superiore appaiono col lucchetto + invito**. Apertura via route **`/app/libreria/[id]/open`** che applica il **GATE lato server** (URL firmato/redirect solo se `canOpenLibraryItem`). RLS verificata (pubblicati visibili, bozze no).
- **Nav:** voce **Libreria** in tabbar atleta e sidebar coach.

### 12.3 — Canale Open: settimana a ordine libero + archivio personale
- **`workouts.week_start`** (lunedì) su `migration_019`; il coach pubblica per settimana (editor + `/coach/open` raggruppato per settimana, "corrente" evidenziata). `lib/week.ts` (lunedì ISO, coerente con `date_trunc('week')`).
- **Atleta "La tua settimana"** (`/app/nuoto`): allenamenti della settimana corrente, etichette focus, **selezione libera**, copy **"Scegli tu quali e quanti farne: 1, 2 o 3."** — **NIENTE streak/badge/percentuali** (vincolo di prodotto rispettato). Solo un neutro "Svolto".
- **"I miei allenamenti"** — archivio svolti da **`workout_completions`** (tabella self-contained: snapshot title/focus/week/metri → **resta mio anche a tier sceso a free**). Popolato al POST check-in (flusso sessione esistente). Dettaglio `/app/nuoto/[id]` (RLS-gated).

### 12.4 — Open+: archivio storico completo
- **`/app/nuoto/archivio`** (solo open_plus): tutti gli Open passati per settimana, **filtro focus + ricerca**, apri/rifai. **Enforcement server**: se il tier non è ammesso non si interrogano i dati, si mostra l'invito (doppio strato: anche la RLS nasconde le settimane passate agli open).
- **Tier open:** la voce Archivio compare con **lucchetto + invito a Open+**.

### ✅ Collaudo per tier — 4 account di prova
| Account | Libreria | Canale Open | Archivio Open (12.4) | 1:1 |
| --- | --- | --- | --- | --- |
| **free** | solo contenuti `free`; gli altri col lucchetto | — (invito a Open) | — (invito) | — |
| **open** | free + `open` | **solo settimana corrente** + i propri svolti | lucchetto + invito Open+ | — |
| **open_plus** | free + open + `open_plus` | settimana corrente + svolti | **tutto lo storico** (filtro/ricerca) | — |
| **one_to_one** | **completa** (tutte le visibilità) | (per matrice NON accede al Canale Open) | — | percorso dedicato 1:1 invariato |
_Per ogni account: verificare che il contenuto di tier superiore sia visibile ma bloccato (lucchetto + invito), e che l'apertura del file sia rifiutata lato server._

### 🔑 Variabili d'ambiente nuove (Onda 12)
- **`STRIPE_PRICE_OPEN_PLUS`** — Price ID del prodotto Open+ (da creare su Stripe; prezzo deciso da Alessio).
- **R2 / storage libreria:** la Libreria oggi usa **Supabase Storage** (bucket privato `library`), tramite l'astrazione `lib/storage.ts` (unico punto di swap, come i video). Il passaggio a **Cloudflare R2** richiederà le chiavi R2 (endpoint/bucket/access key) e la modifica del solo `lib/storage.ts`: **nessuna key R2 è ancora presente** → per ora si resta su Supabase Storage.

### 🌱 Seed "La Streamline" (manuale)
Il PDF `libreria-streamline.pdf` non era nel repo al momento della run (pre-step manuale). **Da fare da Alessio:** in `/coach/libreria` carica il PDF come **"Smart Smooth Swim — La Streamline"**, tipo **PDF**, visibilità **Free**, **pubblicato**. (Nessuna riga fittizia creata a DB per non lasciare un contenuto senza file.)

### 🔒 Invariante 1:1
I workout `kind='personal'` **non sono stati toccati**: `savePersonalWorkout` invariato; la RLS `workouts` mantiene `swimmer_id = auth.uid()` per le schede personali. La programmazione 1:1 (V.3) resta com'era.

_Ultimo aggiornamento V.3: 2026-07-19 — **V.3 Programmazione 1:1 (macrocicli + fasi + note coach) COMPLETO.**_

## 🗺️ Sprint V.3 — Programmazione 1:1 (2026-07-19)
- **`migration_018_programs` APPLICATA:** tre tabelle nuove.
  - **`programs`** (macrociclo): `swimmer_id`, `coach_id`, `title`, `start_date`/`end_date`, `status` (draft/active/closed), obiettivo gara (`goal_race_name`/`_date`/`_pool`/`goal_events`/`goal_time_target`). **Indice unico parziale** `uniq_active_program` → **un solo programma `active` per nuotatore**.
  - **`program_phases`** (meso/fasi): `name`, `phase_type` (generale/specifico/gara/tapering/scarico/transizione), `start_date`/`end_date`, `focus`.
  - **`program_notes`** (note tecniche coach): **tabella separata coach-only** — non una colonna, perché coach e nuotatore sono entrambi `authenticated` e una colonna non si può nascondere via RLS.
- **RLS (verificata con simulazione ruoli, rollback):** `own_active=1 · draft=0 · notes=0 · phases_draft_nascoste · altro_nuotatore=0`.
  - Nuotatore: legge **solo** il proprio programma `active` e le sue fasi. Bozze/chiusi/altrui → invisibili. `program_notes` → **0 righe** (nessuna policy per lui).
  - Coach: `ALL` via `is_coach()` su tutte e tre.
- **`lib/programs.ts`**: tipi + palette fasi (token brand, **niente rosso** — ADR-005) + `validatePhases` (dentro le date del programma, in sequenza, **niente sovrapposizioni** `gap<=0` **né buchi** `gap>1g`) + `currentPhase`/`daysToRace`.
- **Server actions** (`coach/nuotatori/[id]/program-actions.ts`, tutte `requireRole("coach")`): create/savePhases(validate)/saveProgramNotes(upsert)/**activate** (cattura il vincolo `uniq_active_program`)/**close** (→ `archiveProgramVideos(programId)`: archivia **solo** i video di QUEL programma)/duplicate/delete.
- **UI coach** (`program-manager.tsx`): lista programmi, barre-fasi colorate, editor fasi (add/remove + Salva), note tecniche, nuovo programma. Innestata nella scheda nuotatore.
- **UI nuotatore** (`components/programs/program-home-card.tsx`): card sola lettura in home — fase corrente + giorni-a-gara, **niente conto alla rovescia ansiogeno**, niente obiettivo cronometrico se il coach non l'ha messo.
- **Integrazioni:** upload video → **tag automatico** al programma attivo (`registerVideo` setta `program_id`); **digest coach** arricchito col contesto 1:1 (fase corrente · gara tra N gg) sulle righe "Da chiamare / Sta scivolando / Corpo".
- **Test:** RLS come sopra; `validatePhases` respinge sovrapposizioni; `close` archivia solo il programma chiuso; `lint`+`tsc`+`next build` verdi.
- **Debito V.2/V.3 CHIUSO (2026-07-19):**
  - **Vista "Archivio" sulla scheda coach** (`/coach/video`): gli archiviati escono dalla coda "in analisi" e finiscono in un `<details>` "Archivio · N" in fondo, con data e **giorni al purge** (`daysToPurge` in `lib/retention.ts`, +90gg). La coda e il conteggio "in coda" contano solo i `live`.
  - **Notifica in-app all'archiviazione**: `closeProgram` → se archivia ≥1 video, `notifyUser(swimmerId, "retention", …)` avvisa il nuotatore ("rimozione tra 90 giorni, preserva ✦ quelli a cui tieni"). Sulla pagina Video del nuotatore ora compare anche l'avviso inline sui video archiviati (non sui preservati).

## ⚙️ Config manuale (stato al 2026-07-19)
- **Leaked password protection (HaveIBeenPwned):** ⛔️ **non attivabile su piano Free** — Supabase la offre solo su **Pro Plan e superiori** (errore alla Save confermato dal dashboard). Le altre voci auth: `Secure email change` ON, `Require current password when updating` **OFF** (obbligatorio: il reset arriva via link email, l'utente non ha la vecchia password). **→ Da riattivare al passaggio a Pro** (probabile al go-live, anche per backup/limiti).
- **URL Configuration (Redirect URLs + Site URL):** da compilare **in un colpo solo alla fine**, con la lista definitiva preview Vercel + dominio prod (evita di rifarli a ogni sprint).
- **`CRON_SECRET` (Vercel):** necessario perché il cron purge giri in prod. Da impostare al deploy prod.
- **Checklist mobile Onda 11:** QA finale form auth su schermo stretto — un giro solo, alla fine.

## 🎬 Sprint V.2 — Video: cancellazione utente + retention (2026-07-19)
- **`migration_017_video_retention` APPLICATA:** su `race_videos` → `deleted_at`, `purged_at`, `retention_state` (active/archived/preserved), `archived_at`, `program_id` (+3 indici).
- **`lib/storage.ts`** — punto UNICO per lo storage fisico (Supabase Storage oggi; **si cambia solo qui per R2**): `removeVideoObject` (hard delete) + `videoSignedUrl`.
- **Soft delete** (`softDeleteVideo`): il nuotatore cancella i propri (il coach quelli dei suoi), `deleted_at=now()`, sparisce da ogni vista; **"Annulla" per 7 giorni** (`undoDeleteVideo`). Ownership via RLS-read + write con service-role (la UPDATE su `race_videos` è coach-only). Ledger `video.deleted {by, had_analysis}`. Avvisi differenziati (già commentato / birra pagata).
- **Hard delete / purge** (`lib/retention.ts::purgeExpiredVideos`, cron `/api/cron/video-purge` giornaliero, `CRON_SECRET`, in `vercel.json`): soft-deleted >7gg, archiviati >90gg, fallback Open >365gg → **rimuove il FILE** e trasforma la riga in **tombstone** (`purged_at`, `storage_path=null`). **La riga NON si cancella**: i commenti del coach (FK CASCADE) devono sopravvivere (reconciliazione della spec "cancella la riga" con "i commenti restano").
- **Preserva ✦** (`togglePreserve`, max 3/nuotatore) → mai purgato.
- **Retention params** in `lib/retention.ts` (`RETENTION`: grazia 7/90, max 3, Open 365). **`archiveProgramVideos(programId)`** esposta (il trigger "chiusura macrociclo" arriva in V.3).
- **UI**: nuotatore (elimina con avviso, annulla, preserva ✦) + coach (stesse azioni sulla coda). Liste filtrate `deleted_at is null`.
- **Test**: ownership gate verificato (un nuotatore vede **0** video altrui → non può cancellarli); `lint`+`tsc`+`next build` verdi.
- **Da rifinire (thin)**: vista "Archivio" dei video archiviati sulla scheda coach + notifica in-app all'archiviazione (arrivano naturalmente con la chiusura programma in V.3).


## 🔐 Sprint V.0 — Verifiche di sicurezza (2026-07-18)
- **C-1 · Role-lock — CHIUSO.** Era vulnerabile: un nuotatore autenticato poteva fare `update profiles set role='coach'` (verificato: passava). Fix `migration_015_role_lock` (**applicata**): trigger `protect_role_column` blocca il cambio di `role` per `anon`/`authenticated` (42501); `service_role`/`postgres` liberi (creazione admin + promozione manuale). **Ri-testato:** nuotatore → cambio ruolo **negato**, aggiornamento dei propri campi (first_name, anno_nascita…) **OK**.
- **C-3 · Region — OK.** Progetto Supabase in **`eu-central-1` (Francoforte, EU)**. Nessuna migrazione necessaria.
- **⚠️ C-2 · Prima di attivare chiavi Stripe live: verifica firma con raw body + idempotenza per `event.id` (C-2).** (Webhook Stripe NON toccato ora: Stripe parcheggiato.)
- **SITO:** sezione marcata **[SUPERATA — sito in repo dedicato `glide-site`]**; il piano route-group non va eseguito qui.

## 🧭 Sprint V.1 — Intake v2 (agonista/libero) — **COMPLETO · 🛑 al CANCELLO**
- **`migration_016_intake` APPLICATA:** `profiles.athlete_type` + `profiles.onboarding_done` + tabella **`intake`** (spec §5, **senza i campi tempi**: i tempi restano in `personal_bests`). RLS: self select/insert/update, coach select.
- **Wizard esteso** `/app/profilo/crea` (niente wizard parallelo, niente `swim_times`):
  - **Step 0** — due card "Nuoto (anche) in gara" / "Nuoto per me" → `athlete_type`.
  - **Blocco comune** (§2) — anno (+categoria auto solo agonista), vasca, frequenza, **obiettivo** (chip), nota libera.
  - **Percorso A** — specialità → tempi (PB) → **storia** (anni_nuoto/continuità/gare_12m/esperienza_intensità/device_fc).
  - **Percorso B** — corsi, stili che sai nuotare, autovalutazione 1–5 (ancore), aree di miglioramento.
  - Ogni passo saltabile; upsert su `intake` (obbligatori: obiettivo, frequenza, vasca).
- **Motore livello** `lib/profile/intake.ts::livelloLibero` (deterministico, 0–6 → Base/Intermedio/Avanzato). **SOLO coach**, mai al nuotatore. **Test 4/4 verdi**.
- **Scheda coach**: badge Agonista/Libero + **Livello (solo B)** + obiettivo + frequenza/vasca (sola lettura).
- **Onboarding flag** spostato da `localStorage` a `profiles.onboarding_done` (letto in `/app`, salvato via `setOnboardingDone`).
- **Gating "libero"**: il livello NON è persistito e viene calcolato solo nel render coach → **la risposta API del nuotatore non contiene mai livello/CSS/pace/Z5** (per costruzione). Inoltre su `/app/progressi` il nuotatore `libero` **non vede Glide Score né i 6 profili** (spec §4): restano Onda, Effetto Acqua, curva pace@RPE e badge.
- **RLS `intake` verificata** (entrambi i ruoli): scrittura cross-utente → *42501 negato*; self-insert **OK**; coach legge via `is_coach()`.
- `lint` + `tsc` + `next build` verdi.
- **🛑 CANCELLO:** raggiunto. Attendere GO prima di V.2 (video: cancellazione + retention).


**🌐 Deploy di test LIVE:** https://glide-zeta-ten.vercel.app — login GLIDE verificato (200, nessun errore).

**🔎 Verifica 2026-07-18 (sui sistemi reali, non solo sui doc):**
- **Runbook v2 (Fasi 0–9) + cash: già in `main`** e già su Supabase (11+1 migration applicate). Le voci "da pushare" più sotto sono **superate**.
- **Account coach OK:** `glide.smartswim@gmail.com` esiste in auth+profilo, email confermata, `role='coach'`, login recente. La nota "account da ricreare" più sotto è **superata**.
- **Advisor sicurezza:** `migration_012` revoca l'EXECUTE **da PUBLIC** su `handle_new_user` (la 009 revocava da anon/authenticated, ma il grant era ereditato da PUBLIC → no-op). Chiusi i 2 WARN su `handle_new_user`.
  - Restano di proposito i 2 WARN su `is_coach` (usata in 20 policy RLS `to public`: togliere il PUBLIC romperebbe le chiamate REST anon con "permission denied"; la funzione ritorna solo un booleano, nessun dato esposto).
  - Resta **da fare a mano**: Supabase → Auth → abilitare "Leaked password protection".
- **Logo ufficiale integrato** (asset forniti dall'utente): `WaveLogo` ora mostra il lockup reale `public/brand/logo-mark.png` (mark a onde + wordmark), non più l'SVG a cerchi concentrici. Il wordmark è chiaro → su fondo chiaro (login/app in light mode) spariva: risolto con una **placca navy** di default (`plate`), disattivata dove lo sfondo è già scuro (sidebar coach `bg-ink`). Rigenerate le icone PWA (`public/icons/*`) e la `favicon.ico` (ri-encodata in RGBA: quella fornita rompeva il build di Next). Rimosso il "GLIDE" testuale duplicato accanto al mark. `lint` + `tsc` verdi; `next build` compila tutte le route (l'unico stop è env Supabase mancante nel clone, non la modifica).
- **Login/offline splash navy** (design deciso con l'utente): in light la pagina è navy con controlli bianchi e lettering navy (tab attivo blu, bottone Entra blu); in dark il modello scuro precedente. Logo senza placca su queste schermate.

---
## 🌊 ONDA 11 — Auth completa + Profilo atleta + Editor (2026-07-18)

**Migrations applicate su Supabase:** `013_swimmer_profile` (colonne profilo + `personal_bests` + RLS), `014_workout_published_backfill` (`published_at = created_at` dove null).

**11.1 Reset password — FATTO.** Rotte `/forgot-password` (email → `resetPasswordForEmail`), `/auth/callback` (scambio `code` PKCE via `@supabase/ssr`), `/reset-password` (nuova password ≥8, gestione sessione scaduta → link "richiedi nuovo reset"). Link "Password dimenticata?" nel login. Rotte aggiunte a `PUBLIC_PATHS`. Brand navy coerente.
**11.2 Registrazione robusta — FATTO.** Le action auth non fanno più redirect interno: il client gestisce il loading con try/catch/finally + **watchdog 15s** (l'app non resta mai bloccata), submit disabilitato durante l'invio, errori Supabase in italiano (già registrata/email non valida/password debole), schermata **"Controlla la tua email"** con l'indirizzo.
**11.3 Profilo atleta self-service — FATTO.** Wizard 3 passi saltabili su `/app/profilo/crea` (rieditabile da Profilo): (1) anno → **categoria Master FIN auto** (`lib/profile/categoria.ts`, correggibile); (2) specialità a chip (stili/distanze); (3) personal best con tempo **MIN:SEC.CENT** ad avanzamento automatico + anteprima live (`lib/profile/tempo.ts`), upsert unico per distanza+stile+vasca. Dopo signup il nuovo nuotatore è instradato al wizard. Scheda coach: sezione **Profilo in sola lettura**. **Unit test 7/7 verdi** (`categoria.test.ts`, `tempo.test.ts`) via `tsx --test`.
**11.4 Editor: reset + modifica pubblicati — FATTO.** Reset automatico dell'editor a salvataggio confermato dal DB (rimonto via `key`, mai su errore) + "Salvato in scheda" con link. Modifica dei pubblicati entro **14 giorni** (`lib/config.ts WORKOUT_EDIT_WINDOW_DAYS`, imposta sia in UI sia lato server in `updateWorkout`): entro finestra → "Modifica" precompilata (aggiorna il record, `updated_at`, etichetta "Aggiornato" al nuotatore); oltre → lucchetto "Non più modificabile", ma sempre "Duplica come nuovo". Avviso "N atleti l'hanno svolto" (i log delle sessioni non vengono toccati). Applicato a schede personali e Canale Open.

**Verifica:** `npm run lint` + `tsc --noEmit` + `next build` verdi (tutte le route, incluse le nuove). Pagine auth rese a schermo (navy, ok). **RLS `personal_bests` confermata con entrambi i ruoli**: scrittura cross-utente → *42501 negato*; il coach legge i PB dell'atleta (1), un altro nuotatore no (0).

**📌 Da fare a mano (Onda 11):**
- **Supabase → Authentication → URL Configuration**:
  - **Site URL:** `https://glide-zeta-ten.vercel.app` (o dominio prod definitivo).
  - **Redirect URLs** (aggiungere): `https://glide-zeta-ten.vercel.app/auth/callback`, `https://glide-zeta-ten.vercel.app/reset-password`, e per lo sviluppo locale `http://localhost:3000/auth/callback`, `http://localhost:3000/reset-password`.
- Collaudo mobile (dal browser, la mia rete sandbox è isolata):
  - [ ] Password dimenticata → email → nuova password → login (con `RESEND_API_KEY` per l'invio reale).
  - [ ] Registrazione con email già esistente e con rete lenta: l'app risponde, non si blocca.
  - [ ] Creare un profilo atleta completo da telefono (categoria auto, specialità, 3-4 tempi con date) e verificarlo in sola lettura sulla scheda coach.
  - [ ] Salvare un allenamento → editor si svuota da solo; modificare un pubblicato entro 14 giorni → aggiornato; oltre → bloccato con lucchetto.

---
## 🧲 Sottosezione LEAD — impalcatura (2026-07-18)

La voce "Lead" era già in sidebar (`/coach/lead`) ma cadeva sul placeholder `[section]`. Portata la UII sulla tabella `leads` esistente (nessuna migration).
- **`lib/leads.ts`**: tipi + vocabolario `stage` (nuovo/contattato/convertito/perso) e `source` (instagram/tiktok/sito/passaparola/altro) — allineati ai CHECK a DB.
- **`/coach/lead`**: imbuto con conteggi per stage, liste raggruppate, card con contatti cliccabili (`tel:`/`mailto:`), pill sorgente, nota; transizioni di stage (Contattato → Convertito/Perso, Riapri) + Elimina. Form "Nuovo lead" (nome obbligatorio, telefono/email/sorgente/nota) che si chiude a inserimento riuscito.
- **Actions** (`createLead`/`setLeadStage`/`deleteLead`, RLS `requireRole('coach')`).
- **RLS `leads` verificata**: il coach crea+legge (1); uno swimmer che prova a scrivere → *42501 negato* (policy `is_coach()`).
- `lint` + `tsc` + `next build` verdi (`/coach/lead` compilata).

**Converti in nuotatore — FATTO.** Bottone sulla card del lead (stage nuovo/contattato) → modale precompilato (nome→nome/cognome, email) + servizio → crea l'account nuotatore e marca il lead `convertito`. La creazione è estratta in un helper condiviso `lib/coach/create-swimmer.ts` (`createSwimmerAccount`), riusato sia da "Nuovo nuotatore" sia da "Converti lead" (utente auth via service-role + profilo, invito email o password temporanea in simulato). `lint`+`tsc`+`next build` verdi.

---
## 🚀 RUNBOOK v2 (in corso) — spec in `docs/`, migrations in `supabase/migrations/`

**FASE 0 — fatta.** Letti ADR/QUESTIONARIO/VOICE/ONBOARDING/TIPOGRAFIA. Doc copiati in `docs/`. Gerarchia fonti: ADR vince su spec. Le 3 correzioni (events→activity_events; policy bookings solo `is_coach()`; brand ADR-009 no-Teal, Glacial) le applico quando eseguo booking.

**FASE 1.1 — fatta.** `migration_002_readiness_v2` **APPLICATA** su Supabase.
- Adattamento colonne (0.6): `user_id` → **`swimmer_id`** in indice + 3 viste (solo NOMI, logica invariata). Scale (sleep/fatigue/soreness/mood/motivation/rpe) già corrispondenti.
- `security_invoker = true` verificato su `v_readiness`, `v_efficiency_points`, `v_effetto_acqua`.
- **🛑 CANCELLO A (test B2): PASSATO.** A(4·4·5·1·2)=fisica **4.33**/mentale **1.50** · B(2·2·1·5·4)=fisica **1.67**/mentale **4.50**. Distinti; A non genera "alleggerire". Righe di test rimosse.

**❌ Da fare in FASE 1 (dopo GO utente):**
- **1.2 Questionario v2** (nuove scale "5=meglio", ancore visibili, corpo≤3→sede obbligatoria, chip ⚠︎ petto/respiro/testa→L2, post con "E adesso come stai?"). **Rework `lib/readiness.ts`** (rimuovere il bug `6-x` + `readinessScore`) leggendo da `v_readiness`.
- **Violazione ADR-006 §4 da correggere:** `/app/progressi` e `components/readiness/progress.tsx` **mostrano al nuotatore il suo indice** → il nuotatore NON deve vederlo. Gli indici restano solo lato coach.
- 1.3 Curva efficienza (`v_efficiency_points`, ≥6 punti) · 1.4 Effetto Acqua (`v_effetto_acqua`, ≥20 sessioni) · 1.5 Digest coach (Resend) · 1.6 Onboarding 6 schermate.

**FASE 0.3 — Tipografia (ADR-009) — FATTA.** Glacial Indifference 400/700/italic
in `public/fonts/` (+OFL.txt); `font-synthesis:none`; base 17px; scala tipografica
(`.t-display/.t-h1/.t-h2/.t-h3/.t-body/.t-label/.t-data`); `tabular-nums`; Teal
rimosso (alias→navy). Oswald/Montserrat eliminati. Build verde.
- ⚠️ **Da verificare a schermo** (TIPOGRAFIA §4): distinzione `0/O` e `1/l` in Glacial
  su "8x50 SL @1'40\" Z2 · 0O1lI". Se ambigua → Plan B JetBrains Mono per la sola notazione.
  (Da fare prima di rimettere mano all'editor allenamenti.)

**✅ Sbloccati:** GO per tutte le fasi ricevuto · font Glacial ricevuti · `glide-ext-videoanalisi.md` ricevuto (in `docs/`). FASE 2 (ledger) autorizzata.

**FASE 1.2 — FATTA.** Rework readiness:
- `lib/readiness.ts`: via il bug `6-x` e `readinessScore`; nuove scale "5=meglio" con ancore; tipi `VReadinessRow`/`EffettoAcquaRow`; sedi dolore; red-flag/L2.
- `readiness-actions`: `savePre` scrive sleep/energia/corpo/mood/motivation + pain_sites + health_flag + red_flag; corpo≤3→sede obbligatoria; **red-flag → notifica coach + template L2** (LLM mai chiamato, non c'è). `savePost`: rpe + umore_post + nota.
- `checkin.tsx`: UI v2 (ancore visibili, chip sede se corpo≤3, chip petto/respiro/testa).
- **Indice nascosto al nuotatore** (ADR-006 §4): `/app/progressi` ora mostra solo l'Effetto Acqua (≥20 sessioni), niente indice. Il **coach** legge `v_readiness` (fisica + mentale) nel dettaglio nuotatore.
- Build/lint verdi.

**FASE 1.3 — FATTA.** Curva di efficienza:
- `lib/workout.ts`: `mainSetSig(blocks)` (firma set principale "SL|100|100|Z3") + `sigLabel`.
- `savePost` calcola `main_set_sig` dall'allenamento scelto; il post check-in ha un **selettore allenamento** (`/app` passa personal+open).
- `components/readiness/efficiency.tsx`: RPE a parità di set, ≥6 punti, mai "peggioramento". Su dettaglio coach e `/app/progressi`.
- Finestra 8 settimane spostata nella vista `v_efficiency_points` (migration_003, applicata). Build/lint verdi.

**FASE 1.4–1.6 — FATTE. ✅ FASE 1 COMPLETA.**
- **1.4 Effetto Acqua**: in `SwimmerProgress` (≥20 sessioni), niente indice al nuotatore.
- **1.5 Digest coach** (`lib/digest.ts`): 4 sezioni (Da chiamare / Sta scivolando / Corpo / Certificati), max 3 righe, ogni riga un link-azione, osservazioni mai prescrizioni. Segnale "sta scivolando" = fisica buona + sparito ≥5gg → motivazione. **In-app sulla Dashboard coach** (modalità simulata senza Resend). Cron `/api/cron/digest` + `vercel.json` (lun 07:00) → invia via Resend se configurato.
- **1.6 Onboarding**: 6 schermate copy identico, schermata 2 non skippabile, su `/app` (localStorage). Build/lint verdi.

**FASE 2 — FATTA. ✅ Activity ledger (ADR-003/004/007).**
- `migration_001_activity_ledger` applicata: `activity_events` append-only (RLS select/insert own-or-coach, **niente update/delete**), vocabolario chiuso, 2 indici.
- `lib/ledger.ts`: `logEvent(supabase, userId, type, payload)` **fail-soft** (un errore del ledger non fa mai fallire il check-in/upload). `EventType` = vocabolario chiuso, pronte anche le voci S7/S8.
- Collegato ai punti sorgente live:
  - `readiness.pre` in `savePre` → `{sleep, energia, corpo, umore, motivazione, health_flag}` — **mai le sedi del dolore** (solo booleano).
  - `readiness.post` in `savePost` → `{rpe, umore_post, has_note, workout_id}` — **la nota resta fuori** (solo `has_note`).
  - `workout.completed` in `savePost` quando il post è su un allenamento → `{workout_id, meters, minutes, zones}` (metri/zone dai blocchi).
  - `video.uploaded` in `registerVideo` → `{video_id}` (id catturato con `.select("id").single()`).
  - `race.logged` — nessuna sorgente ancora (arriverà con le gare).
- **Backfill** (`migration_004_backfill_ledger`, idempotente: gira solo se la tabella è vuota): eventi storici da `readiness`+`race_videos` con `occurred_at`=storico. Prodotti: 2 `readiness.pre` + 2 `readiness.post` (le sedute a DB non avevano workout né video). `workout.completed` di backfill lascia `meters` null → ricalcolo a valle.
- `tsc --noEmit` pulito.

**FASE 3 — FATTA. ✅ S7 Booking & Agenda.** (3 correzioni applicate: `events`=calendario vs `activity_events`=ledger; `bookings`/`event_signups`/`lesson_credits` scrivibili solo `is_coach()` — ADR-008; brand ADR-009 no-Teal.)
- **DB** (`migration_005_booking`): `services` (pool_60/30, call_60/30), `availability_rules`, `availability_exceptions`, `bookings` (con **EXCLUDE gist anti-overlap** su `tstzrange(starts_at, block_until)` per coach), `lesson_credits`, `plan_entitlements` (tier = `service_type` REALE: coaching_1_1/both → 1 lez/mese+remoto, open → 0), `events`, `event_signups`. RLS su tutte. `btree_gist` abilitato.
- **Slot engine** `lib/booking/slots.ts` — funzione pura, DST-safe Europe/Rome (`romeWallToUtc` a doppio raffinamento). **14/14 asserzioni verdi** sugli esempi canonici (§3) + 2 casi DST (29/03, 25/10).
- **Crediti** `lib/booking/credits.ts`: `ensureCreditPeriod` (idempotente, agganciato all'apertura di `/app/prenota`), `consumeCredit`/`refundCredit` **guardati** (optimistic, anti doppio-consumo), periodo mese/bimestre.
- **API** (nodejs, service-role dove serve): `GET /slots` (ricalcolo lato server, admin per vedere TUTTE le prenotazioni), `POST /create` (ri-valida slot → 402 senza credito+extra, 409 su `exclusion_violation`, ledger `booking.created`), `POST /cancel` (rimborso oltre 24h, ledger `booking.cancelled`), `GET /ics` (VEVENT+alarm 24h), `POST /events/signup` (capienza→waitlist, ledger `event.signup`). Coach: `booking.completed`/`no_show` da server action.
- **UI Coach** `/coach/agenda` (3 tab): Disponibilità (finestre + anteprima "ultima 60' alle…", duplica-settimana, chiudi-giorno, apertura-extra), Prenotazioni (Presente/Assente + nota che va allo storico), Eventi (form + tipi §7 + "oscura agenda"). Nav "Agenda".
- **UI Nuotatore** `/app/prenota` (3 tap): servizio → giorno (strip 14gg, giorni vuoti spenti) → ora → riepilogo → Prenota. Card "Le tue lezioni" (+.ics, disdici "gratis fino a 24h"), sezione Eventi ("Ci sono"/waitlist). Call solo se `remote_allowed`. Tab "Prenota".
- **Stripe lezioni extra: PARCHEGGIATO** con il resto della riconfig Stripe → senza credito la prenotazione è `payment='free'` (badge "Simulato").
- **Collaudo**: seminata disponibilità reale coach (Lun 12–14:30 vasca, Mer 18–20 vasca+remoto, Ven 12–13:30 call). Vincolo anti-overlap testato a DB (A ok, B respinta). `next build` + `tsc` verdi.

**Checklist collaudo booking (spec §9):**
- [x] Finestra coach Lun 12:00–14:30 step 15 solo vasca (seminata).
- [x] 7 slot per 60' e 9 per 30' (slot engine, verificato).
- [x] Prenoto 12:30 (60') → spariscono 12:00–12:45…; primo libero 13:45 per 30' (engine).
- [x] Doppio-click stesso slot → il secondo riceve 409 (EXCLUDE testato a DB).
- [ ] Credito 1/1 → 0/1 e la 2ª chiede pagamento *(manuale, in-app)*.
- [ ] Disdetta a 48h → credito reso; a 3h → perso *(manuale)*.
- [x] Nuotatore Open non vede le call né ha crediti (gating `remote_allowed`/entitlement).
- [ ] Evento `chiusura_piscina` mercoledì → nessuno slot quel giorno *(manuale)*.
- [x] Nuotatore A non vede le prenotazioni di B (RLS `r_book` own-or-coach).
- [x] Ora legale 25/10 e 29/03 mantengono l'orario (test DST verdi).

---

**FASE 4 — FATTA. ✅ S8 Evento Videoanalisi.** (Il nuotatore sceglie i *test*, il coach decide l'*ordine*: niente scelta oraria dal client.)
- **DB** (`migration_006_videoanalisi`): `events` esteso (format/window_start/end/lanes/setup_min/warmup_lead_min/travel_before/after/runsheet_status), + `tests` (catalogo, 8 seed), `event_tests`, `signup_tests`, `runsheet` (unique event+signup e event+position). RLS: catalogo pubblico, scrittura solo coach; `signup_tests` proprie o coach; **`runsheet` visibile al nuotatore solo se `published` e solo la SUA riga**.
- **Motore scaletta** `lib/events/runsheet.ts` — puro/deterministico: riempimento corsie (l'orologio che si libera prima), warmup clampato a window_start, overrun + `capacityLevel` (semaforo). **13/13 asserzioni verdi** (no-overlap corsia, 2 corsie, sfori, verde/giallo/rosso).
- **Slot engine aggiornato**: un evento bloccante oscura l'agenda da `starts_at−travel_before` a `ends_at+travel_after` (viaggio A/R).
- **API/azioni** (coach, RLS): `createVideoEvent` (+event_tests), `generateRunsheet`, `reorderRunsheet` (↑/↓), `recompactRunsheet` (togli assenti, esplicito), `publishRunsheet` (+notifica a ciascun iscritto), `setRunStatus` (live), `setSignupStatus` (accetta/waitlist), `closeVideoEvent` (→ crea voci **coda video** taggate `#eventId` + `videoanalisi.done` nel ledger, dedup). `POST /events/signup` esteso con i test scelti; `GET /events/ics` (solo la propria riga).
- **UI Coach** `/coach/videoanalisi`: form creazione (3 blocchi + **capienza stimata live**), dettaglio con **semaforo**, iscrizioni (accetta/waitlist), scaletta (genera/riordina/ricompatta/pubblica/chiudi) e **riepilogo LIVE** (ora in acqua / prossimo) con toggle stato per riga. Nav "Videoanalisi".
- **UI Nuotatore** (in `/app/prenota` → Eventi): per la videoanalisi sceglie i test → "il tuo pacchetto: N minuti", si iscrive; a scaletta pubblicata vede **solo il suo orario** (scalda/in acqua/fine + corsia) e `.ics`. Mai la scaletta degli altri.
- `next build` + `tsc` verdi. Motore verificato; RLS r_run garantita a livello DB.

**Checklist collaudo videoanalisi (spec §6):** capienza stimata [x engine], pacchetto minuti [x], semaforo 🔴→🟢 con 2ª corsia [x engine/UI], genera scaletta senza overlap [x engine], riordino ricalcola [x], draft nascosto al nuotatore [x RLS], pubblica→solo il suo orario+.ics [x], assente non riscrive da solo (ricompatta esplicito) [x], evento oscura agenda incluso viaggio [x], chiusura→coda video col tag [x]. *(Le voci che dipendono da dati live restano da provare in-app.)*

---

**FASE 5 — FATTA. ✅ Onda + Glide Score** (GLIDE_GAMIFICATION §3-4, ADR-005/006).
- **Libreria pura** `lib/score/index.ts`: `computeOnda` (EMA aderenza `onda·0.75 + aderenza·25`, clamp 0–100, **mai stato rosso** → "acqua calma"), pesi Glide Score (Costanza 25 · Continuità 20 · Qualità 20 · Aderenza 20 · Miglioramento 15), **inerzia ±3/sett**, **congelamento in Pausa**, `ALGO_VERSION`, `isoWeek`. **14/15 asserzioni verdi** (la 15ª era un'attesa sbagliata: l'onda converge a 100 asintoticamente, ~97 dopo 12 sett. piene — corretto).
- **DB** `migration_007_glide_scores`: storico settimanale `glide_scores` (swimmer_id, week ISO, onda, dims jsonb, score, frozen, `algo_version`) — sempre versionato, RLS (nuotatore il proprio, coach tutto).
- **Compute** `lib/score/compute.ts`: legge il ledger (`readiness.pre/post`, `video.uploaded`) + `v_efficiency_points` + `zone_rpe_bands`. Dimensioni: Costanza (completate/previste 4 sett.), Continuità (=Onda), Qualità (RPE in banda di zona), Aderenza (pre/post appaiati + bonus video), Miglioramento (trend RPE a parità di lavoro). **Fallback onesto**: dati insufficienti → dimensione neutra + flag; `ready=false` sotto 3 settimane di dati → il Glide Score NON si mostra ("un numero rumoroso è peggio di nessun numero"). `computeAndStore` con inerzia vs ultimo salvato.
- **Cron**: il lunedì (route digest) calcola e salva Onda+Score per ogni nuotatore.
- **UI**: nuotatore su `/app/progressi` vede **Onda** (sempre, gentile) + **Glide Score** (solo se `ready`, altrimenti "stiamo raccogliendo dati"); il **coach** sulla scheda nuotatore vede lo stesso col **breakdown 5 dimensioni** (~ = stima su pochi dati). **ADR-006 rispettato**: l'indice readiness resta nascosto al nuotatore; Onda/Score sono lo strato motivazionale, non l'indice.
- `next build` + `tsc` verdi.

---

**FASE 6 — FATTA. ✅ Badge** (GLIDE_GAMIFICATION §5: niente premi di partecipazione; i conferiti danno valore agli automatici).
- **DB** (`migration_008_badges`, applicata): `badges` (catalogo 9 voci: 7 auto + 2 **conferiti** — Capitano ⚓, Occhio in Acqua 👁️) + `swimmer_badges` (unique swimmer+badge, `awarded_by` per i conferiti, `note` del coach). RLS: catalogo leggibile, il nuotatore vede solo i propri, scrive solo il coach (gli automatici via service-role dal cron).
- **Detection automatica** `lib/badges/detect.ts` (idempotente, nel cron del lunedì): **Prima Bracciata** (primo ciclo pre+post completo), **Prime Onde** (4 settimane consecutive ≥75% aderenza), **Onda dopo Onda** (6 mesi senza un mese fermo). I 4 data-hungry (Acqua Calma, Metronomo, Tecnico, Costruttore) restano a catalogo: meglio non assegnare che assegnare a caso — la detection arriverà con lo storico.
- **UI Coach** (scheda nuotatore): vetrina badge + pannello **"Conferisci un badge"** con riga di nota personale ("una riga tua vale cento trofei di pixel") e revoca. Il conferimento manda una **notifica** al nuotatore con la nota.
- **UI Nuotatore** (`/app/progressi`): vetrina badge; i conferiti dal coach sono distinti ("conferito da Alessio" + nota tra virgolette).
- Al primo cron: Marta e Salvatore (1 pre + 1 post a testa nel ledger) ricevono **Prima Bracciata** automaticamente.
- `next build` + `tsc` verdi.

---

**FASE 7 — FATTA. ✅ Assistant safety router** (ADR-001 + ADR-004).
- **Matcher deterministico** `lib/assistant/safety.ts`: keyword L1 (muscoloscheletrico) e L2 (red flag) ESATTE dall'ADR-004, normalizzazione accenti/maiuscole, match parola-intera con plurali, **L2 vince su L1**. Template fissi copy identico ADR (L1 "Segnalo la cosa ad Alessio…", L2 "Fermati… chiama il 112"). **20/20 asserzioni verdi** (incluso il limite noto e voluto: "vista" scatta anche come participio — falso positivo prudente).
- **Router** `lib/assistant/router.ts` — ordine non negoziabile: (1) safety PRIMA di tutto — se scatta il modello **non è mai chiamato**, risponde il template + **notifica al coach** senza il contenuto del sintomo (né ledger: vocabolario chiuso ADR-007, il health_flag appartiene al check-in); (2) L0 via Anthropic (Haiku) SOLO se `ANTHROPIC_API_KEY` (flag `ai`), system prompt coi confini ADR-001 (mai carichi, mai rassicurare, max 120 parole, tono Esploratore); (3) **fallback onesto** senza modello. Output SEMPRE e solo testo — nessun percorso scrive su workouts.
- **API** `POST /api/assistant` (auth, max 2000 char) → `{text, safety}`.
- **UI**: bottone flottante + pannello chat nel PWA nuotatore ("Spiega, non prescrive. Il carico resta di Alessio."). Cronologia **solo in memoria di pagina**: i messaggi non si persistono da nessuna parte (ADR-004). Risposte safety evidenziate in ambra.
- `next build` + `tsc` verdi. NB: senza `ANTHROPIC_API_KEY` su Vercel l'assistente risponde col fallback ma il **safety router è già attivo e completo**.

---

**FASE 8 — FATTA. ✅ Identità** (GLIDE_GAMIFICATION §6: "specchio", non classi).
- **Motore puro** `lib/identity/index.ts`: 5 identità (Esploratore/Costante/Tecnico/Competitore/Mentore) con testi-specchio (riconoscimento, mai una richiesta). **Gate onesto**: primo evento a ledger ≥8 settimane fa **e** ≥4 settimane attive nelle ultime 8 — un buco non azzera lo specchio, ma pochi dati non fanno un ritratto. Priorità del tratto distintivo: **Mentore** (badge Capitano conferito dal coach — il giudizio umano vince) → Competitore (≥2 gare o ≥3 video) → Tecnico (test videoanalisi) → Costante (aderenza ≥75% + 6 settimane senza buchi) → Esploratore (nessun tratto dominante — mai un ripiego negativo). **12/12 asserzioni verdi.** Niente livelli/classifiche/upgrade.
- **Segnali** `lib/identity/compute.ts`: tutto dal ledger + badge, auto-riferito.
- **UI** `IdentityCard`: compare **solo quando esiste** — niente countdown né barre di avvicinamento ("uno specchio che ti dice quanto manca sarebbe un gioco"). Su `/app/progressi` e sulla scheda coach.
- `next build` + `tsc` verdi. Con i dati attuali (1 settimana) nessuno vede l'identità: giusto così, si accende da sola a soglia.

---

**FASE 9 — FATTA. ✅ Collaudo finale. RUNBOOK v2 COMPLETO (0–9).**
- **Security advisors** (tutti WARN, zero errori) → `migration_009_security_hardening` applicata: `search_path` fisso su `set_updated_at`/`is_coach`/`handle_new_user`; revoke EXECUTE di `handle_new_user` da anon+authenticated (è un trigger, non un RPC) e di `is_coach` da anon; `btree_gist` spostata nello schema `extensions`.
- **Performance advisors** (79 WARN) → `migration_010_fk_indexes` applicata: **21 indici** a copertura delle FK. `auth_rls_initplan` (25) e `multiple_permissive_policies` (24) documentati e lasciati: trascurabili alla scala attuale (~30 utenti), le policy separate lettura/scrittura sono una scelta di chiarezza; `unused_index` (9) normali su app appena nata.
- **RLS: 28/28 tabelle** con row security attiva (verificato su pg_tables).
- **EXCLUDE anti-overlap testato sul DB reale**: doppio booking sovrapposto → il secondo rifiutato con `exclusion_violation`; vincolo integro anche dopo lo spostamento di btree_gist. Dati di test ripuliti.
- **Fix lint** (`react-hooks/purity` su `/coach/agenda`): cutoff derivato da `romeWallToUtc(today, −2gg)` invece di `Date.now()` nel render.
- **`npm run lint` + `tsc --noEmit` + `next build` tutti verdi.**
- Resta da fare **a mano** (non via SQL): Supabase → Auth → abilitare "Leaked password protection" (HaveIBeenPwned).

## Runbook v2 — riepilogo finale
| Fase | Contenuto | Stato |
|---|---|---|
| 0 | Letture ADR/spec, docs in repo | ✅ |
| 1 | Readiness v2 (due indici, curva efficienza, digest, onboarding, Glacial) | ✅ live |
| 2 | Ledger `activity_events` + logEvent + backfill | ✅ live |
| 3 | Booking & Agenda (slot engine DST-safe, crediti, EXCLUDE, UI coach+nuotatore) | ✅ live |
| 4 | Videoanalisi (scaletta deterministica, travel, coda video) | ✅ live |
| 5 | Onda + Glide Score (EMA, ±3/sett, versionato, cron) | ✅ live |
| 6 | Badge (conferiti+automatici, detection idempotente) | ✅ live |
| 7 | Assistant safety router (matcher deterministico ADR-004, L0 flag-gated) | ✅ live |
| 8 | Identità (specchio a soglia 8 settimane) | ✅ live |
| 9 | Collaudo (advisors, RLS 28/28, EXCLUDE, lint/build) | ✅ live |

**📌 Push finale: FATTO.** 6+7+8+9 sono in `main` (migration 008/009/010 applicate su Supabase). *(verificato 2026-07-18)*
**📌 Post-push (facoltativi):** `ANTHROPIC_API_KEY` su Vercel per accendere l'assistente L0 · Stripe test-mode (parcheggiato) · leaked-password protection su Supabase Auth · verifica leggibilità numeri Glacial (occhio umano).

---

## Aggiornamento spec 17/07 — ADR-010/011 (cash) + conformità + fix mobile

**Fix mobile coach (segnalato):** la sidebar ora è un **drawer a scomparsa** sotto `lg` — topbar con hamburger, overlay, ogni tap su un link chiude il menu. Desktop invariato. L'app coach si usa in verticale.

**FASE 3.7 — Pagamento diretto `cash` (glide-ext-pagamenti, ADR-010/011). FATTA.**
- `migration_011_cash_payments` applicata: `payment_method`/`payment_status`/`amount_cents`/`receipt_number`/`paid_at` + constraint `cash_needs_status` + backfill del metodo sulle righe esistenti.
- API `create`: senza crediti il nuotatore sceglie; `cash` → booking `da_incassare` con importo dal listino. **Stripe non configurato → l'opzione online non compare, resta il diretto** (il vecchio percorso "free simulato" per le lezioni è rimosso). Copy sobrio: "Il pagamento (€X) lo sistemi direttamente con Alessio in vasca."
- Coach: badge **"Da incassare · €X" in navy** (promemoria, non errore), "Segna incassato" (+ n° ricevuta) sulla card e nella nuova **tab Cassa** (elenco, totale, filtro Tutto/Mese, sezione incassati) — deep-link `?tab=cassa`.
- Digest lunedì, sezione "I numeri" (ADR-011): "N lezioni da incassare · €X · la più vecchia è di N giorni fa" → tap sulla Cassa.
- Ledger: `booking.created` porta `payment_method`; nuovo tipo `payment.collected` al "Segna incassato". Il denaro NON entra mai in Onda/Glide Score.
- **Prove sul DB reale**: constraint rifiuta `cash` senza stato e `credit` con stato (check_violation) · **il nuotatore NON può marcarsi incassato** (update con JWT nuotatore → 0 righe, RLS nega, stato invariato).

**Badge — conformità ADR-005 §8-10 + FASE 6 nuova. FATTA.**
- **Niente emoji, niente coriandoli** (registro adulto): vetrina e conferimento ridisegnati sobri; la colonna emoji resta a DB ma non si mostra.
- **Motivazione OBBLIGATORIA, max 140 caratteri** sui conferiti — è quella frase il premio. La notifica al nuotatore è la frase stessa, senza emoji.
- **Silenzio in pausa** (§8): nuotatore non `attivo` → nessun badge automatico, nessun conferimento (pannello coach lo spiega), nessuna notifica.
- **Gate fisica** (6.3): media `readiness_fisica` ultime 2 settimane < 3.0 → nessun badge automatico scatta.
- **Onda congelata in pausa** (FASE 5): oltre allo Score, ora anche l'Onda resta all'ultimo valore salvato.

**Assistente — 7.1/7.2 nuova. FATTA.**
- L2 esteso con le **frasi**: "testa che gira" / "mi gira(va) la testa". **9/9 verifiche verdi**, inclusi i 4 test canonici del runbook (spalla→L1, peso sul petto→L2, allenamento di domani→passa, stanco morto→passa).
- **System prompt v2** in file dedicato (`lib/assistant/system-prompt.ts`): voce dell'app senza nome, riconoscimenti attribuiti ad Alessio, zero emoji/esclamativi/superlativi, ogni affermazione con un dato, "Non ho questo dato. Chiedilo ad Alessio.", vietati completi, solo TESTO. Benvenuto del widget adeguato.

**Docs**: `GLIDE_ADR.md` aggiornato (ADR-010/011, ADR-005 §8-10), `glide-ext-pagamenti.md` e `PROMPT_CODE_MASTER.md` in `docs/`.
`lint` + `tsc` + `next build` verdi. Migration 011 già su Supabase: al push è tutto live.

**✅ Account coach RICREATO** *(verificato 2026-07-18)*: `glide.smartswim@gmail.com`
esiste in auth+profilo, email confermata, `role='coach'`, con login recente. Nessuna
azione residua. *(La vecchia nota "da ricreare" è superata.)*
---
Da rifinire: `NEXT_PUBLIC_APP_URL` = questo URL (poi Redeploy) e Supabase → Auth → URL Configuration (Site URL) = questo URL.

## Riferimenti nel repo
- `reference/glide-suite.jsx` — prototipo UI da portare fedelmente (coach desktop + nuotatore mobile). **Gitignored.**
- `reference/glide-schema.sql` — schema Supabase.
- `.env.local` — variabili d'ambiente (gitignored, mai committato).

## ✅ Fatto (Sprint 0 — impalcatura)
- Scaffold Next.js 16 (App Router, TS, Tailwind v4, ESLint, `src/`).
- Brand: palette ufficiale (ink/turchese/navy/blu/teal) + font Oswald/Montserrat; logo onde concentriche (`WaveLogo`).
- PWA installabile: `manifest.webmanifest`, icone 192/512/maskable/apple, service worker + registrazione.
- Supabase: client browser + server (`@supabase/ssr`) + middleware refresh sessione.
- Auth: login email+password (server actions) + gating ruoli → `profiles.role` instrada coach → `/coach`, swimmer → `/app`.
- Shell brand: sidebar coach + bottom-tab nuotatore (nav rispecchia il prototipo). Pagine **placeholder**.
- Feature flag (`lib/flags.ts`): senza chiavi Stripe/Resend la funzione resta "simulata", nessun crash.
- `.claude/settings.json` (permessi) + `STATO.md`.

## 🗄️ Schema Supabase — DEPLOYATO
Tutte le tabelle esistono (verificato via REST, 200): `profiles`, `workouts`,
`readiness`, `race_videos`, `video_comments`, `subscriptions`, `transactions`,
`leads`, `messages`, `social_posts`, `notifications`. RLS attiva; trigger
`handle_new_user` crea il profilo al signup.

## 🔑 Env (solo presenza, nessun valore)
- **Presenti:** `NEXT_PUBLIC_APP_URL/NAME`, Supabase URL+anon+service, Stripe publishable+secret, `EMAIL_FROM`.
- **Placeholder:** `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` (Open/Open Water/Elite/Birra), `RESEND_API_KEY`.

## ✅ Fatto (Sprint 1 — Nuotatori + Allenamenti + Canale Open)
- **Dominio** (`lib/workout.ts`): port fedele parser shorthand (`8x50 SL @1'20" palette Z3`), zone Z1–Z5, strokes, attrezzi, `parseLine/fmtTime/blockMeters/woMeters`, `lineLabel`.
- **Tipi** (`lib/types.ts`): `SwimmerRow`, `WorkoutRow`, label servizio/stato/cert, helper nome/iniziali.
- **Nuotatori**: `/coach/nuotatori` (lista da `profiles`, card stato/cert/pacchetto) + `/coach/nuotatori/[id]` (scheda editabile → update `profiles`; archivia = status 'scaduto', niente delete). "Nuovo nuotatore" crea l'utente auth via **service_role** (invito email in modalità simulata finché manca Resend → mostra password temporanea).
- **Editor allenamenti a zone** (`components/workout/editor.tsx`): blocchi (zona/nome/rounds) + righe con **parsing live** e calcolo metri; riusato per scheda personale e Canale Open.
- **Canale Open**: `/coach/open` pubblica `workouts(kind='open_channel', week_day)`; `/app/nuoto` (nuotatore) legge Canale Open + schede personali **via RLS**.
- Colonne query validate contro lo schema reale; build verde (11 route).

## ✅ Fatto (Sprint 2 — Readiness + Progressi)
- **Check-in** (`components/readiness/checkin.tsx`): pre (sonno/fatica/dolori/umore/motivazione 1–5) + post (RPE 1–10 + nota), su `/app` (Oggi). Insert su `readiness` via RLS (il nuotatore scrive i propri).
- **Punteggio prontezza 0–100** (`lib/readiness.ts`): fatica/dolori pesano invertiti.
- **Grafici** (recharts, `components/readiness/chart.tsx` + `progress.tsx`): prontezza + RPE nel tempo. Su `/app/progressi` (nuotatore) e nel dettaglio nuotatore lato coach.
- Colonne `readiness` validate; build verde (12 route).

## ✅ Fatto (Sprint 3 — Video gare + Stripe)
- **Upload video** (`components/video/uploader.tsx`): carica su Storage `race-videos/{user_id}/…` col client browser (RLS: cartella propria), poi `registerVideo`. tier dal servizio: 1:1/both → analisi inclusa (`pending`, paid); Open → `locked`.
- **Nuotatore** `/app/video`: lista propri video, playback con **signed URL**, sblocco "Offrimi una birra €5", analisi del coach.
- **Coach** `/coach/video`: coda (pending→locked→reviewed), playback firmato, **commenti** (`video_comments`) → mette il video `reviewed`, "segna analizzato".
- **Stripe** (`lib/stripe-checkout.ts`): checkout birra (una tantum) + abbonamenti (Open/Open Water/Elite) su `/app/profilo`. **Webhook** `/api/stripe/webhook`: sblocca video (birra) e specchia abbonamenti/transazioni via service_role.
- **Feature flag / simulato**: senza chiavi Stripe, lo sblocco birra avviene via service_role (come il webhook) + transazione marcata "simulato"; abbonamenti mostrano badge "simulato". Nessun crash.
- Middleware: escluso `/api` dal gating (il webhook risponde 200 no-op se Stripe è off — verificato).

## ✅ Fatto (Sprint 4 — Business + Social)
- **Business** `/coach/business`: KPI (ricavi totali, MRR, birre, abbonati attivi), grafico ricavi mensili (vista `v_monthly_revenue`), **soglia forfettario** (€85.000) con barra + disclaimer "non è consulenza fiscale", elenco transazioni.
- **Social** `/coach/social`: planner a griglia IG-style; pilastri (Consigli/Allenamento/Gare/Coach/Su di me), tipi Open plan/Chiuso/Design, canali; creazione post + avanzamento stato draft→scheduled→published (`social_posts`, RLS coach).
- Colonne `social_posts` e vista ricavi validate; build verde (18 route).

## ✅ Fatto (Sprint 5 — PWA offline + Notifiche + verifica)
- **Notifiche in-app**: helper `lib/notify.ts` (insert via service_role, no-op se assente); create sugli eventi → upload video/sblocco birra notificano il coach, il commento del coach notifica il nuotatore. `/coach/notifiche` + sezione notifiche su `/app` (Oggi); "segna letta / tutte lette" (RLS).
- **PWA offline**: `sw.js` v2 network-first con precache app shell e **pagina `/offline`** come fallback di navigazione; `/offline` resa pubblica nel middleware.
- **Verifica finale (runtime):** `npm run dev` parte senza errori; gating ok (`/`,`/coach/*`,`/app/*` → `/login` da non loggato); `/login` e `/offline` = 200; `manifest.webmanifest`/`sw.js` = 200; webhook Stripe = 200 no-op. Build verde (20 route).

## 🔑 Cosa richiede una CHIAVE per funzionare al 100% (checklist)
Tutto il resto gira già. Queste voci ora sono in **modalità simulata** finché non aggiungi le chiavi in `.env.local` (e su Vercel come Environment Variables):

1. **Pagamenti reali (Stripe)** — servono i **Price ID** e il **webhook secret**:
   - `STRIPE_PRICE_OPEN`, `STRIPE_PRICE_OPEN_WATER`, `STRIPE_PRICE_ELITE` (abbonamenti), `STRIPE_PRICE_BIRRA` (€5).
   - `STRIPE_WEBHOOK_SECRET` (da `stripe listen` in locale o dall'endpoint webhook in produzione).
   - Senza: lo sblocco "birra" avviene simulato (via service_role) e gli abbonamenti mostrano il badge "simulato".
2. **Email (Resend)** — `RESEND_API_KEY` (+ dominio verificato per `EMAIL_FROM`):
   - Serve per l'**invito email** ai nuovi nuotatori (ora: password temporanea mostrata a schermo) e per future email transazionali.
3. **Dominio in produzione** — `NEXT_PUBLIC_APP_URL` = dominio reale (per success/cancel URL Stripe e metadata).
4. *(opzionale, quando i video crescono)* Mux/Cloudflare Stream per lo streaming — in demo bastano Supabase Storage + signed URL.

> Nota: le chiavi **Supabase** (URL, anon, service_role) sono già presenti e validate. Lo schema è già deployato.

## 🚀 Deploy Vercel (ambiente di test)

Stato codice: `npm run build` verde, `npm run lint` pulito, **nessun segreto
hardcodato** (tutto da `process.env`), `.env.local` gitignored, webhook su
runtime Node. Manca solo ciò che richiede i tuoi account (checklist B sotto).

### Environment Variables da incollare su Vercel (Project → Settings → Environment Variables)
Copia **nome per nome**. I valori sono nel tuo `.env.local`.

**Obbligatorie — devono esserci PRIMA del primo build** (le `NEXT_PUBLIC_*` vengono
inlined a build-time; senza, il build Vercel fallisce):
1. `NEXT_PUBLIC_APP_URL` → l'URL del deployment Vercel (es. `https://glide-suite.vercel.app`)
2. `NEXT_PUBLIC_APP_NAME` → `GLIDE`
3. `NEXT_PUBLIC_SUPABASE_URL`
4. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. `SUPABASE_SERVICE_ROLE_KEY`  *(segreta, solo server)*
6. `EMAIL_FROM`

**Opzionali — attivano le funzioni "simulate"** (puoi aggiungerle dopo, senza rompere il build):
7. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
8. `STRIPE_SECRET_KEY`  *(segreta)*
9. `STRIPE_WEBHOOK_SECRET`  *(segreta — la ottieni al passo webhook sotto)*
10. `STRIPE_PRICE_OPEN`
11. `STRIPE_PRICE_OPEN_WATER`
12. `STRIPE_PRICE_ELITE`
13. `STRIPE_PRICE_BIRRA`
14. `RESEND_API_KEY`  *(segreta)*

> Le `NEXT_PUBLIC_*` sono pubbliche (finiscono nel browser). Le altre sono **segrete**: solo server.
> Imposta tutte su Environment = **Production + Preview** (per i deploy di test).

### Webhook Stripe da registrare
- **Endpoint URL:** `https://<il-tuo-dominio-vercel>/api/stripe/webhook`
  - es. `https://glide-suite.vercel.app/api/stripe/webhook`
- **Evento da ascoltare:** `checkout.session.completed`
- Dopo aver creato il webhook, copia il **Signing secret** (`whsec_…`) in `STRIPE_WEBHOOK_SECRET` su Vercel e fai **Redeploy**.
- In locale per testare: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

### Passi (richiedono i tuoi account → checklist B)
1. **GitHub**: crea un repo (es. `glide-suite`) e collega questo repo locale:
   ```bash
   git remote add origin https://github.com/<tuo-utente>/glide-suite.git
   git push -u origin main
   ```
   (Ora non c'è remote; `gh` non è installato → lo fai tu con le tue credenziali.)
2. **Vercel**: New Project → Import da GitHub → seleziona `glide-suite`. Framework rilevato: Next.js.
3. Incolla le **Environment Variables** (lista sopra) **prima** di lanciare il deploy.
4. Deploy. Poi registra il **webhook Stripe** con l'URL sopra, copia `whsec_…` in `STRIPE_WEBHOOK_SECRET`, **Redeploy**.
5. Su **Supabase → Auth → URL Configuration**: aggiungi l'URL Vercel ai *Redirect URLs* / *Site URL*.

## ▶️ Prossimo passo
Fase 1 completa. Da fare con l'utente: (a) **checklist chiavi** qui sopra;
(b) provare i flussi con un account **coach** (promuovere il proprio profilo)
e uno **swimmer**; (c) eventuale **deploy su Vercel** + collegamento remote GitHub.
Fuori scope Fase 1 (schema presente ma UI non portata): **Chat** coach⇄nuotatore, **Lead**.

## 🌊 SITO (funnel pubblico) — **[SUPERATA — sito in repo dedicato]**
> ⛔️ **NON eseguire questo piano.** Il sito marketing vive in un repo separato
> (`glide-site` → glideswim.it), non in questo. Il piano di ristrutturazione a
> route group qui sotto è **superato**: lasciato solo per memoria storica.

<details><summary>Piano storico (superato)</summary>

> Obiettivo: sito-funnel nello **stesso repo**, sostituisce Linktree, cattura email, spinge nell'app.
> Sprint dedicati **S1–S4** (numerazione del runbook "SITO", distinta dagli Sprint 0–5 dell'app).

**Rilevato (S0, 2026-07-12):**
- Nessun route group esiste: `src/app/` è piatto (`app/`, `coach/`, `login/`, `offline/`, `page.tsx` = redirect per ruolo).
- Token brand già centralizzati in `globals.css` (CSS vars + `@theme inline`) + `fonts.ts` → punto 4 di S0 già soddisfatto; manca solo aggiungere le zone Z1–Z5.
- Gating in `lib/supabase/middleware.ts`: pubblici `/login /auth /api /offline`; tutto il resto protetto.

**Piano di ristrutturazione:**
1. `src/app/(app)/` ← sposto `app/` e `coach/` (URL invariati; i route group non cambiano i path).
2. `RegisterSW` + metadata PWA → `(app)/layout.tsx` (il marketing non carica SW/bundle app).
3. `src/app/(marketing)/` con layout proprio (header/footer, CTA unico "Entra in GLIDE").
4. Pagine SSG: `/ /metodo /hub /prezzi /grazie /privacy /termini` + bio coach su **`/coach-alessio`**
   (`/coach` è già il gestionale → conflitto risolto con slug dedicato).
5. Root `page.tsx`: da redirect-per-ruolo → home marketing statica.
6. `middleware`: gating ristretto a `/app` e `/coach` (+ redirect `/login`); marketing pubblico/statico.
7. Token: aggiungo Z1 #CBD5E1, Z2 #92D050, Z3 #FFF200, Z4 #FFC000, Z5 #FF0000 in `globals.css`.
8. Copy in `content/site.ts` (unico file editabile dall'utente).

**Decisioni prese:** bio pubblica su `/coach-alessio` (default, app URLs stabili). **In attesa di via libera per S1.**

</details>

## Log sprint
- **Sprint 0** — impalcatura completa. Commit `e42a908` (+ `19134ab` settings). Build verde, login+gating validati in locale.
- **Sprint 1** — Nuotatori (CRUD profiles), editor allenamenti a zone col parser del prototipo, Canale Open (coach pubblica → swimmer legge via RLS). Build verde.
- **Sprint 2** — Readiness check-in pre/post + punteggio prontezza; grafici progressi (recharts) lato nuotatore e coach. Build verde.
- **Sprint 3** — Video gare (upload Storage + signed URL, coda coach, commenti) + Stripe (birra €5 + abbonamenti + webhook), con modalità simulata se mancano le chiavi. Build verde (16 route).
- **Sprint 4** — Business (KPI, ricavi mensili, soglia forfettario + disclaimer, transazioni) + Social planner (griglia, pilastri/tipi, stati). Build verde (18 route).
- **Sprint 5** — Notifiche in-app (create sugli eventi) + PWA offline (sw v2 + pagina /offline) + verifica finale. Build verde (20 route).
- **Deploy prep** — audit segreti (nessun hardcode, tutto da process.env), lint pulito (escluso `reference/`), webhook runtime Node + fallback `VERCEL_URL`, elenco Environment Variables e URL webhook in STATO.md. In attesa di GitHub/Vercel/Stripe (checklist B).
