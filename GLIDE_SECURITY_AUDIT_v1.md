# GLIDE — Audit Sicurezza & Privacy (v1)
### Revisione architetturale · stato "pre-implementazione build"

> **Cosa è questo documento.** Un audit tecnico-organizzativo dell'architettura GLIDE (app di coaching + sito marketing) dal punto di vista di **cyber security** e **protezione dati (GDPR + normativa IT)**. Consolida ed estende `GLIDE_PRIVACY_SECURITY_REVIEW.md`.
>
> **Base dell'analisi.** Product Bible, runbook di deploy, prototipi `glide-gestionale.jsx` / `glide-app.jsx` / editor / calendario, e stato noto del progetto. Il modello dati è **inferito dai prototipi**, non verificato sullo schema SQL reale (vedi §9 — file da caricare).
>
> **Non è consulenza legale.** Le voci normative (DPIA, basi giuridiche Art. 9, retention) vanno validate da un DPO/legale prima del lancio pubblico.

---

## 0. Sintesi esecutiva

GLIDE tratta in modo massiccio **dati sanitari e di categoria particolare** (certificati medici, readiness fisica/mentale, sintomi in chat, video del nuotatore, risultati del test). Questo sposta il baricentro del rischio dalla sicurezza pura alla **compliance GDPR**: è qui che si annidano le esposizioni legali più gravi.

Sul piano tecnico i tre punti critici già noti restano i più urgenti: **escalation di ruolo**, **webhook Stripe non verificato**, **regione Supabase non confermata EU**. Nessuno dei tre deve sopravvivere al passaggio a pagamenti/dati reali.

| Livello | # voci | Blocca cosa |
|---|---|---|
| 🔴 Critico | 5 | Il lancio con dati reali o pagamenti reali |
| 🟠 Alto | 7 | Il lancio pubblico / apertura iscrizioni |
| 🟡 Medio | 8 | Da chiudere durante le build |
| 🟢 Continuativo | 6 | Compliance da mantenere nel tempo |

---

## 1. 🔴 CRITICI — da chiudere prima di dati/pagamenti reali

### C1 — Escalation di ruolo via `profiles`
**Rischio.** Se `role` vive in `public.profiles` e la RLS consente all'utente di fare `UPDATE` sulla propria riga, un nuotatore può eseguire `update profiles set role='coach'` e ottenere la vista completa (dati sanitari, business, tutti i nuotatori).
**Fix.**
- Il `role` **non deve essere auto-modificabile**. Opzioni (scegline una):
  - trigger `BEFORE UPDATE` su `profiles` che solleva eccezione se `role` cambia e l'attore non è `service_role`/coach;
  - spostare il ruolo su tabella dedicata `user_roles`, scrivibile **solo** da `service_role`;
  - policy con column-level check che blocca la modifica di `role`.
- Il trigger `handle_new_user` deve **forzare** `role='swimmer'` all'iscrizione, ignorando qualsiasi valore inviato dal client.
- La promozione a coach avviene **solo** lato server (service_role) o via SQL admin.

### C2 — Webhook Stripe senza verifica firma
**Rischio.** Un `POST` falso a `/api/stripe/webhook` può simulare `checkout.session.completed` e sbloccare video o attivare abbonamenti **gratis**.
**Fix.**
- Verificare `stripe-signature` con `STRIPE_WEBHOOK_SECRET` usando `stripe.webhooks.constructEvent(rawBody, sig, secret)`.
- **App Router gotcha:** leggere il **raw body** (`await req.text()`), non il JSON parsato, altrimenti la firma non torna mai.
- **Idempotenza:** deduplicare per `event.id` (Stripe ritenta) così una "birra" non viene accreditata due volte.
- L'**entitlement** (video sbloccato, tier abbonamento) si deriva **solo** dagli eventi Stripe, mai da input del client.

### C3 — Regione Supabase / residenza dati non confermata EU
**Rischio.** Se il progetto Supabase (e/o le function Vercel, e/o R2) non è in EU, ogni riga di dato sanitario è un trasferimento internazionale non mappato.
**Fix.**
- Confermare la region Supabase = **EU** (es. Frankfurt `eu-central-1`). Se è fuori EU → **ricreare** il progetto in EU e migrare (non "spostabile" a caldo).
- Vercel: impostare la region delle function su EU (es. `fra1`).
- Cloudflare R2: verificare location hint EU + jurisdiction.
- Produrre una **mappa dei trasferimenti** (§4-T).

### C4 — `service_role` key: rischio esposizione client
**Rischio.** La `service_role` **bypassa la RLS**. Se finisce in una variabile `NEXT_PUBLIC_*` o in un componente client, chiunque legge il bundle ottiene accesso totale al DB.
**Fix.**
- `service_role` **solo** server-side (route handler, server action, cron). **Mai** `NEXT_PUBLIC_`.
- Al browser arriva **solo** la `anon` key.
- Verifica: `grep -r "service_role\|SERVICE_ROLE" app/ components/` non deve comparire in codice client; controllare che non sia nel bundle (`.next`).

### C5 — Storage video privato + Storage-RLS
**Rischio.** I video ritraggono persone identificabili = dato personale (e potenzialmente biometrico-adiacente). Un bucket pubblico o senza policy = data breach.
**Fix.**
- Bucket `race-videos` **privato**; accesso solo via **signed URL** a TTL breve.
- Path per-utente (`{userId}/...`) + **Storage policies** che consentono a ogni utente `select/insert` **solo** sulla propria cartella; il coach solo sui propri nuotatori.
- Stesso principio su R2: nessun oggetto pubblico, presigned URL con scadenza.

---

## 2. 🟠 ALTI — prima del lancio pubblico / apertura iscrizioni

### A1 — Copertura RLS su tutte le tabelle con dati personali
Verificare, tabella per tabella, che RLS sia **ENABLED** con policy esplicite (mai `USING (true)`, mai RLS abilitata ma priva di policy per un'operazione): `profiles`, `readiness`, `workouts`, `messages`/chat, `payments`/`subscriptions`, `video`/metadata, `medical_certificates`, `events`, `leads`.
**Design multi-tenant:** "il coach vede tutto" oggi = un solo coach; scrivere le policy già scoping su `coach_id`, così l'apertura ad altri coach non richiede riscrittura né apre isolamenti errati.

### A2 — Endpoint cron Vercel protetti
Le route chiamate dal cron (nurture Resend, scadenze certificati) devono richiedere un header segreto `CRON_SECRET` verificato server-side; altrimenti chiunque le innesca (spam email, enumeration).

### A3 — Auth server-side su ogni route mutante
Ogni API route che scrive dati verifica la sessione (`auth.uid()`) server-side. Dove si usa `service_role`, la RLS non protegge più: l'autorizzazione va **ricontrollata in codice**.

### A4 — Health Safety Router non aggirabile
Il router che intercetta i messaggi con sintomi **prima** di qualsiasi chiamata LLM deve girare **server-side** (non bypassabile dal client), con matching deterministico su vocabolario **italiano** dei sintomi. L'AI **legge e segnala, non modifica mai il carico**: garantirlo a livello di backend, non di prompt. Aggiungere disclaimer esplicito "GLIDE non fornisce consulenza medica".

### A5 — Dati sanitari verso provider LLM
Se si invia testo/health data a un LLM (OpenAI/Anthropic/altro): è un **trasferimento** + relazione da responsabile + potenziale dato particolare verso provider USA.
- Firmare la **DPA** del provider; usare tier con **zero data retention** dove disponibile.
- **Minimizzare**: non inviare mai certificati, nome+patologia, o dati identificativi; passare solo il minimo necessario, meglio se pseudonimizzato.

### A6 — Segreti: git history pulita + rotazione
- Confermare `.env*` in `.gitignore` (il runbook già lo nega a Claude Code — bene).
- Scansione storia git con `gitleaks`/`trufflehog`. Se **una sola** chiave è mai finita in un commit → **ruotarla** (Stripe, Supabase service_role, Resend, R2, webhook secret).
- Chiavi a privilegio minimo: Stripe **restricted key**; token R2 scoped al singolo bucket.

### A7 — Security headers + hardening trasporto
Impostare via `next.config`/Vercel: `Content-Security-Policy`, `Strict-Transport-Security` (HSTS), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`. Log Vercel: assicurarsi che **non** registrino PII o dati sanitari.

---

## 3. 🟡 MEDI — da chiudere durante le build

- **M1 — Baseline migrazioni.** Il ledger migrazioni è vuoto (11 tabelle create a mano). Fare `supabase db pull` per generare una **migration di baseline** tracciata, poi applicare via ledger `migration_001_events` e `migration_002_readiness_v2` (oggi pendenti). Senza baseline non c'è change-management né riproducibilità tra ambienti.
- **M2 — Applicare le 2 migrazioni pendenti** (dopo M1), incluso il rename `fatigue/soreness → Energia/Corpo` (fix scala invertita).
- **M3 — Incompatibilità tabella `leads`.** Il vecchio `public.leads` ha `coach_id NOT NULL` + CHECK chiuso su `source`: incompatibile con gli insert del sito. Confermato che sito e app usano tabelle/progetti **separati** — mantenere la separazione, nessuna scrittura incrociata.
- **M4 — Rate limiting** su auth, endpoint del test, upload.
- **M5 — Validazione input** (server-side) su tutti i form: test (9 domande), lead, readiness, editor workout. Difesa da injection/XSS stored (le note lead/chat vengono renderizzate).
- **M6 — Upload video: limiti** MIME/dimensione/durata + scansione base; niente esecuzione lato server dei file.
- **M7 — Errori & logging** senza leak: nessun dato sanitario nei messaggi d'errore mostrati o nei log.
- **M8 — Backup & recovery** Supabase: verificare PITR/backup attivi e testare un restore; definire RPO/RTO minimi.

---

## 4. 🟢 COMPLIANCE GDPR / IT — continuativa (il blocco legale)

GLIDE tratta **dati sanitari e di categoria particolare (Art. 9)**: questo è il fronte con l'esposizione legale maggiore.

### G1 — Base giuridica per i dati sanitari (Art. 9)
Certificati, readiness, sintomi in chat, risultati test = categoria particolare. Il contratto (Art. 6(1)(b)) copre il **servizio** ma **non** basta per i dati sanitari: serve un titolo Art. 9, realisticamente **consenso esplicito (Art. 9(2)(a))** — separato, granulare, revocabile, con checkbox **non pre-flaggata**.

### G2 — Mappa basi giuridiche (Art. 6) per trattamento
| Trattamento | Base |
|---|---|
| Account & servizio coaching | Contratto |
| Pagamenti | Contratto + obbligo legale (fiscale) |
| Dati sanitari (cert./readiness/sintomi) | **Consenso esplicito Art. 9** |
| Email marketing / nurture | Consenso (opt-in, meglio **double opt-in**) |
| Risultati test (lead) | Consenso |
| Analytics non essenziali | Consenso (cookie banner) |

### G3 — Informativa privacy (Art. 13) — sito **e** app
Titolare (identità reale/P.IVA), finalità, basi, **retention**, destinatari (Supabase, Stripe, Resend, Cloudflare, Vercel, eventuale LLM = responsabili), trasferimenti, diritti dell'interessato, diritto di reclamo al **Garante**.

### G4 — DPA con i responsabili (Art. 28)
Sottoscrivere/accettare la DPA di **ognuno**: Supabase, Stripe, Resend, Cloudflare, Vercel, provider LLM. Tenere copia/evidenza.

### G5 — Trasferimenti extra-UE (Capo V) — (§C3-T "mappa")
Tabella che elenca ogni sub-responsabile, la sua region, se il dato esce dall'UE e con quale garanzia (SCC / DPF). Preferire region EU ovunque disponibile; per USA (Stripe/Resend/LLM) affidarsi alle **SCC** della loro DPA e documentarlo.

### G6 — DPIA (Art. 35) — **probabilmente obbligatoria**
Trattamento **su larga scala di dati sanitari + profilazione/scoring** (readiness + Glide Score) rientra nei trigger dell'elenco del Garante. Non è un "se": pianificare la **DPIA prima del lancio pubblico**. Se l'esito segnala rischio residuo elevato → consultazione preventiva del Garante.

### G7 — Registro dei trattamenti (Art. 30)
L'esenzione per piccole realtà **non si applica** quando si trattano dati particolari: il **registro è dovuto**. Mantenerlo aggiornato.

### G8 — Diritti dell'interessato (macchina operativa)
Predisporre: **export** dati (portabilità), **cancellazione/anonimizzazione** (oblio), **revoca consenso** marketing con **unsubscribe funzionante in ogni email Resend** (obbligatorio + one-click).

### G9 — Retention & minimizzazione
- **Certificati medici:** valutare se serve archiviare il **PDF** o basta **data di scadenza + flag validità** (minimizzazione). Se si archivia il file: cifratura at-rest, accesso stretto, cancellazione X mesi dopo scadenza/fine rapporto.
- **Lead / test_results:** definire retention + **auto-purge** (es. 24 mesi senza conversione).
- **Chat con contenuti sintomatici:** definire retention. Non conservare dati sanitari "per sempre, per sicurezza".

### G10 — Minori
Target Master (40–60) = adulti: bene. Ma se l'onboarding include "Principiante" generico → **age-gate adulti-only** oppure gestione consenso genitoriale (in Italia soglia consenso digitale = **14 anni**). Confermare l'assunzione adulti-only.

### G11 — Sito: il Test come punto di raccolta health
Il "Test del Nuotatore Master" raccoglie dati fitness/health da **non-clienti**: al punto di raccolta servono **informativa + consenso esplicito** per conservazione e per il nurture email (consenso, **non** legittimo interesse trattandosi di dato health-adiacente).

### G12 — Cookie & analytics (decisione aperta)
Se si adottano trackers con cookie (GA4, Meta Pixel) → **cookie banner con consenso preventivo** (il Garante è severo su GA4). **Raccomandazione:** analytics **cookieless/privacy-first** (Plausible, Umami, Vercel Analytics senza cookie) → niente banner, niente problemi di trasferimento.

---

## 5. Cosa fare ORA vs. cosa in BUILD vs. continuativo

**ORA (prima di toccare dati/pagamenti reali) — 🔴**
C1 ruolo · C2 webhook · C3 region EU · C4 service_role · C5 storage video privato.

**PRIMA DEL LANCIO PUBBLICO — 🟠 + legale minimo**
A1 RLS completa · A2 cron protetti · A4 health router · A6 segreti/rotazione · A7 headers · G1/G2 basi giuridiche · G3 informativa · G4 DPA · **G6 DPIA** · G11 consenso sul test.

**DURANTE LE BUILD — 🟡**
M1–M2 migrazioni · M4 rate limit · M5 validazione input · M6 upload · M8 backup/restore · A3 auth route · A5 minimizzazione LLM.

**CONTINUATIVO — 🟢**
G5 mappa trasferimenti aggiornata · G7 registro · G8 diritti · G9 retention/purge · G10 age-gate · G12 cookie policy.

---

## 6. Checklist operativa (spuntabile)

**Access / AuthZ**
- [ ] `role` non auto-modificabile (trigger o `user_roles`)
- [ ] `handle_new_user` forza `swimmer`
- [ ] RLS ENABLED + policy esplicite su tutte le tabelle dati
- [ ] Policy già scoped su `coach_id` (multi-tenant-ready)
- [ ] `service_role` assente dal codice client / bundle

**Pagamenti**
- [ ] Verifica firma webhook con raw body
- [ ] Idempotenza per `event.id`
- [ ] Entitlement solo da eventi Stripe
- [ ] Stripe restricted key

**Storage**
- [ ] Bucket `race-videos` privato + Storage RLS per-utente
- [ ] Signed URL TTL breve; R2 nessun oggetto pubblico

**Infra / segreti**
- [ ] Region EU: Supabase + Vercel + R2 confermate
- [ ] `.env*` gitignored; git history scansionata; chiavi ruotate se esposte
- [ ] `CRON_SECRET` sugli endpoint cron
- [ ] Security headers (CSP/HSTS/…)
- [ ] Backup/PITR verificati con restore di prova

**AI**
- [ ] Health router server-side, vocabolario IT
- [ ] AI non modifica il carico (garanzia backend)
- [ ] Minimizzazione dati verso LLM + DPA provider

**GDPR / IT**
- [ ] Consenso esplicito Art. 9 (checkbox non pre-flaggata)
- [ ] Informativa Art. 13 (sito + app)
- [ ] DPA firmate con tutti i responsabili
- [ ] Mappa trasferimenti (Capo V)
- [ ] **DPIA** avviata
- [ ] Registro trattamenti (Art. 30)
- [ ] Export / cancellazione / revoca consenso operativi
- [ ] Unsubscribe in ogni email
- [ ] Retention definita (certificati, lead, chat) + auto-purge
- [ ] Age-gate adulti-only confermato
- [ ] Consenso al punto di raccolta del test
- [ ] Analytics cookieless (o cookie banner conforme)

---

## 7. Migrazioni & change-management (dettaglio)

1. `supabase db pull` → migration di **baseline** che fotografa le 11 tabelle esistenti.
2. Committare la baseline.
3. Applicare `migration_001_events` e `migration_002_readiness_v2` **tramite ledger**.
4. Da qui in poi: **nessuna modifica via SQL Editor a mano** — solo migrazioni tracciate.

---

## 8. Priorità consigliata (ordine di attacco)

1. C1 → C2 → C4 (bassa fatica, alto impatto: chiudono i buchi di autorizzazione e pagamento).
2. C3 + C5 (residenza dati + storage: toccano la base legale di ogni dato).
3. A1 + A4 (RLS completa + health router).
4. Blocco legale: G1/G3/G4/**G6 DPIA** (avviare in parallelo, hanno lead-time).
5. 🟡 build items durante lo sviluppo normale.

---

## 9. File da caricare per la verifica riga-per-riga

Questo audit è basato sul modello **inferito dai prototipi**. Per una verifica puntuale (policy per policy, colonna per colonna) servono:

1. **`glide-schema.sql`** — per validare RLS reale, colonna `role`, FK, CHECK, Storage policies.
2. **`GLIDE_PRIVACY_SECURITY_REVIEW.md`** — per riconciliare senza contraddire il lavoro già fatto.
3. **`PROMPT_CODE_SEC.md`** — per verificare che il runbook di sicurezza copra C1–C5.
4. *(Opzionale)* **`GLIDE_ADR.md`** — per allineare le decisioni ai vincoli già formalizzati (ADR-001…009).

Caricali e converto questo audit in un piano eseguibile per Claude Code, con le policy SQL esatte e i diff di codice.

---
*GLIDE — Audit Sicurezza & Privacy v1 · documento di lavoro, non consulenza legale.*
