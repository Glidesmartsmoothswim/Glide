# STATO — GLIDE

> PWA coaching nuoto Master · Next.js 16 (App Router) + TS + Supabase + Stripe.
> Documento di stato: aggiornato **alla fine di ogni sprint**, così le sessioni
> future ripartono da qui.

_Ultimo aggiornamento: 2026-07-11 — **Fase 1 completa + ONLINE su Vercel (test)**._

**🌐 Deploy di test LIVE:** https://glide-zeta-ten.vercel.app — login GLIDE verificato (200, nessun errore).
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

## 🌊 SITO (funnel pubblico) — piano, non ancora eseguito
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

## Log sprint
- **Sprint 0** — impalcatura completa. Commit `e42a908` (+ `19134ab` settings). Build verde, login+gating validati in locale.
- **Sprint 1** — Nuotatori (CRUD profiles), editor allenamenti a zone col parser del prototipo, Canale Open (coach pubblica → swimmer legge via RLS). Build verde.
- **Sprint 2** — Readiness check-in pre/post + punteggio prontezza; grafici progressi (recharts) lato nuotatore e coach. Build verde.
- **Sprint 3** — Video gare (upload Storage + signed URL, coda coach, commenti) + Stripe (birra €5 + abbonamenti + webhook), con modalità simulata se mancano le chiavi. Build verde (16 route).
- **Sprint 4** — Business (KPI, ricavi mensili, soglia forfettario + disclaimer, transazioni) + Social planner (griglia, pilastri/tipi, stati). Build verde (18 route).
- **Sprint 5** — Notifiche in-app (create sugli eventi) + PWA offline (sw v2 + pagina /offline) + verifica finale. Build verde (20 route).
- **Deploy prep** — audit segreti (nessun hardcode, tutto da process.env), lint pulito (escluso `reference/`), webhook runtime Node + fallback `VERCEL_URL`, elenco Environment Variables e URL webhook in STATO.md. In attesa di GitHub/Vercel/Stripe (checklist B).
