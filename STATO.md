# STATO — GLIDE

> PWA coaching nuoto Master · Next.js 16 (App Router) + TS + Supabase + Stripe.
> Documento di stato: aggiornato **alla fine di ogni sprint**, così le sessioni
> future ripartono da qui.

_Ultimo aggiornamento: 2026-07-21 — **ONDA 12 (Tier di accesso + Libreria + Canale Open a ordine libero + Open+) COMPLETA.**_

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
