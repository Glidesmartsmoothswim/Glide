# GLIDE — Rotte e schermate dell'app attuale

**Risposta a:** `GLIDE_AUDIT_COERENZA.md` §8 · A6 — l'inventario che serve a
chiudere §6 con dati invece che con impressioni.
**Data:** 13 settembre 2026
**Baseline:** questo è il perimetro funzionale che il prototipo nuovo può
riorganizzare e non può perdere.

---

## 1 · Come è stato costruito

Non a memoria. Enumerazione meccanica di `src/app/**` (`page.tsx`, `route.ts`,
`layout.tsx`), dei componenti effettivamente montati da ciascuna pagina, delle
funzioni `"use server"` esportate, e delle tabelle interrogate da ciascuna
rotta (`.from(...)` e `.rpc(...)` nei file della cartella della rotta). I
conteggi di righe vengono dal progetto di produzione
(`unsdbeliaunhhgnuefyz`), letti il 13 settembre 2026.

Totale: **47 file di rotta** — 35 pagine e 12 route handler — più 3 layout. Sul
lato dati: **43 tabelle e 4 viste** in `public`. Dei 12 route handler, 10 stanno
sotto `/api` (§6); gli altri due sono `/auth/callback` (§3) e
`/app/libreria/[id]/open` (§4), che non sono interfacce.

---

## 2 · Le sei correzioni a §6

Prima delle tabelle, perché è per questo che A6 esisteva. Cinque righe di §6
vanno riscritte, e una assenza va aggiunta.

**1. La chat coach↔atleta non esiste nell'app.** §6 la elenca fra le funzioni
«presenti in entrambi». Nell'app esiste una voce di sidebar `/coach/chat` che
non ha una pagina propria: cade su `src/app/coach/[section]/page.tsx`, che
rende un `Placeholder` con titolo «Chat» e sottotitolo «Conversazioni con i tuoi
atleti». La tabella `messages` esiste, ha **0 righe**, e **nessun file in `src/`
la nomina**. Non è una funzione che il prototipo rischia di perdere: è una
funzione che nessuno dei due ha. Va decisa, non confrontata. E il lato nuotatore
non ha nemmeno il segnaposto: nella tab bar non c'è.

**2. I badge sono schema dormiente, non una funzione.** §6 scrive «`badges`,
`swimmer_badges` — tabelle presenti». Entrambe hanno **0 righe**. Nessuna
schermata le mostra, nessuna azione assegna un badge, e l'unica lettura in tutto
il codice è `src/lib/identity/compute.ts:30`, che controlla l'esistenza del solo
codice `capitano` come segnale per lo specchio identità. `badges` è una delle
quattro tabelle che il codice dell'app non tocca mai. Il prototipo non le perde:
non c'è niente da perdere.

**3. «Analisi effetto acqua ed efficienza» non sono strumenti coach.** §6 le
classifica così. Le viste `v_effetto_acqua` e `v_efficiency_points` sono lette
da `/app/progressi` — la schermata del **nuotatore** — come `OndaCard`,
`Torta` e `EfficiencyCurves`, e dalla scheda coach. Se il prototipo le tratta
come pannello riservato al coach, toglie qualcosa al nuotatore.

**4. I primati personali sono una funzione viva, non una tabella presente.**
`personal_bests` ha **88 righe** ed è modificabile dal nuotatore in
`/app/profilo` tramite `PbManager`, con quattro azioni server
(`upsertPersonalBest`, `editPersonalBest`, `deletePersonalBest`, più
`addObjective` accanto). Al pari di §6 n. 3 sul Glide Score, è dato prodotto e
usato: farlo sparire dall'interfaccia è una scelta, non una semplificazione.

**5. Libreria, lead e social: le schermate esistono, il contenuto no.**
`/app/libreria`, `/coach/libreria`, `/coach/lead`, `/coach/social` sono pagine
reali e complete, con azioni di creazione, pubblicazione e cancellazione. Le
tabelle sono a **0 righe** tutte e tre. Per la libreria questo conta due volte:
è la funzione che il sito promette in tutti e quattro i livelli (§6 n. 1), e
oggi nell'app è un contenitore vuoto — quindi il rischio non è solo che il
prototipo non la mostri, è che non ci sia niente da mostrare.

**6. Un'assenza che §6 non elenca: `/app/[tab]` è codice morto.**
`src/app/app/[tab]/page.tsx` dichiara quattro tab segnaposto (nuoto, video,
progressi, profilo). Tutte e quattro hanno una pagina statica reale, che in Next
vince sul segmento dinamico: quel file non è raggiungibile da nessun URL. È
l'ultimo residuo dello scheletro iniziale, e va cancellato — non riprodotto nel
prototipo.

---

## 3 · Rotte pubbliche e di autenticazione

Fuori dai due gusci. Nessun ruolo richiesto.

| Rotta | File | Cosa è | Tabelle |
|---|---|---|---|
| `/` | `app/page.tsx` | Smistamento per ruolo: non loggato → `/login`, coach → `/coach`, nuotatore → `/app`. Nessuna UI | — |
| `/login` | `app/login/page.tsx` | Accesso e registrazione, con secondo fattore (`verifyLoginMfa`) | — |
| `/forgot-password` | `app/forgot-password/page.tsx` | Richiesta di reimpostazione | — |
| `/reset-password` | `app/reset-password/page.tsx` | Nuova password | — |
| `/auth/callback` | `route.ts` | Scambio del codice OAuth/magic link | — |
| `/privacy` | `app/privacy/page.tsx` | Informativa | — |
| `/termini` | `app/termini/page.tsx` | Termini e condizioni | — |
| `/offline` | `app/offline/page.tsx` | Pagina di fallback del service worker (PWA) | — |

Dopo la registrazione il nuotatore viene mandato a `/app/profilo/crea`
(`login/actions.ts:97`): è lì che comincia l'onboarding, non su `/app`.

---

## 4 · App del nuotatore — `/app/*`

**Guscio:** `app/app/layout.tsx`. Richiede il ruolo `swimmer`. Monta, in
quest'ordine: il **gate di riconsenso** (bloccante — se
`terms_privacy_accepted_at` è nullo non si monta nient'altro), il banner
«completa il nome», il widget assistente, e la tab bar. Larghezza massima
mobile (`max-w-md`): è una PWA verticale.

**Tab bar — 7 voci:** Oggi · Nuoto · Libreria · Prenota · Video · Progressi ·
Profilo.

| Rotta | In tab bar | Schermata | Gating di livello | Tabelle |
|---|---|---|---|---|
| `/app` | Oggi | Saluto, card del percorso attivo, **check-in readiness pre/post**, prompt del **feedback settimanale**, notifiche, **onboarding** | — | `bookings` `notifications` `profiles` `programs` `program_phases` `readiness` `weekly_feedback` `workouts` `workout_completions` |
| `/app/nuoto` | Nuoto | Settimana del Canale Open, allenamenti personali, **builder self-service**, invito all'upgrade, link all'archivio | `open:week` · `open:self` · `open:archive` | `profiles` `workouts` `workout_completions` |
| `/app/nuoto/[id]` | — | Scheda allenamento: blocchi, autoregolazione, chiusura seduta, modifica dello svolto | ownership | `workouts` `workout_completions` `v_readiness` |
| `/app/nuoto/archivio` | — | Storico degli allenamenti | `open:archive` (RLS: `open` vede corrente + precedente, `open_plus` tutto) | `workouts` |
| `/app/libreria` | Libreria | Elenco contenuti con lucchetto per livello | `library:*` per elemento | `library_items` |
| `/app/libreria/[id]/open` | — | Route handler: verifica il livello e rilascia l'URL firmato. **Non è una schermata** | `canOpenLibraryItem` | `library_items` |
| `/app/prenota` | Prenota | Prenotazione lezioni, eventi aperti, lezioni in arrivo, token | `canBookRemote` per le sedute remote | `bookings` `events` `event_signups` `event_tests` `signup_tests` `lesson_tokens` `profiles` `runsheet` `services` |
| `/app/video` | Video | Caricamento video gara, commenti del coach, sblocco a pagamento, annulla-cancellazione | `video:review` | `race_videos` `video_comments` `profiles` `programs` |
| `/app/progressi` | Progressi | **Glide Score**, curva di carico, effetto acqua, efficienza, torta delle zone, specchio identità | — | `glide_scores` `v_effetto_acqua` `v_efficiency_points` `workout_completions` `profiles` |
| `/app/profilo` | Profilo | Dati, servizio e livello, **primati personali**, obiettivi, richiesta di pagamento, secondo fattore, uscita | — | `profiles` `intake` `personal_bests` `objectives` `lesson_tokens` |
| `/app/profilo/crea` | — | **Questionario iniziale** (`intake`) e primi primati. Prima schermata di ogni nuovo iscritto | — | `profiles` `intake` `personal_bests` |
| `/app/abbonamenti` | — | Listino, **configuratore Elite**, consenso alla rinuncia al recesso, bonifico, pacchetti lezioni | — | `profiles` |
| `/app/[tab]` | — | **Codice morto** (vedi §2 n. 6) | — | — |

`/app/abbonamenti` si raggiunge da `/app/profilo` e dall'invito all'upgrade
(`components/access/upgrade-hint.tsx`), non dalla tab bar.

---

## 5 · Console del coach — `/coach/*`

**Guscio:** `app/coach/layout.tsx`. Richiede il ruolo `coach`. Sidebar fissa da
`lg`, drawer con hamburger sotto. Nessun gate di riconsenso: il coach non passa
da lì.

**Sidebar — 14 voci in 7 gruppi.** Una delle 14 (`/coach/chat`) non ha una
pagina: vedi §2 n. 1.

| Gruppo | Rotta | Schermata | Tabelle |
|---|---|---|---|
| Panoramica | `/coach` | **Digest**: chi merita un gesto oggi, calcolato da `lib/digest`, con link diretti alla scheda | `workouts` (+ digest su più tabelle) |
| Panoramica | `/coach/stato` | Stato del sistema: conteggi e semafori di configurazione | `library_items` `profiles` `programs` `services` `workouts` |
| Nuotatori | `/coach/nuotatori` | Elenco a **segmenti: 1:1 · Open · Base gratuito** | `bookings` `glide_scores` `lesson_tokens` `profiles` `v_readiness` `workout_completions` |
| Nuotatori | `/coach/nuotatori/[id]` | Scheda nuotatore a **7 tab**: Panoramica · Programmazione · Andamento · Video · Obiettivi & PB · Pagamenti · Note | `activity_events` `glide_scores` `intake` `lesson_tokens` `objectives` `package_purchases` `personal_bests` `profiles` `program_notes` `program_phases` `programs` `race_videos` `v_efficiency_points` `v_readiness` `video_comments` `workouts` `workout_completions` |
| Nuotatori | `/coach/lead` | Anagrafica contatti, stadi, conversione in nuotatore | `leads` (0 righe) |
| Allenamento | `/coach/open` | Pubblicazione del Canale Open, editor allenamento | `workouts` `workout_completions` `activity_events` `profiles` |
| Allenamento | `/coach/agenda` | **4 tab: Disponibilità · Prenotazioni · Eventi · Cassa.** Fasce, eccezioni, chiusure, conferme, no-show, incassi | `availability_rules` `availability_exceptions` `bookings` `events` `event_signups` `event_tests` `signup_tests` `lesson_tokens` `profiles` `race_videos` `runsheet` `services` `transactions` |
| Allenamento | `/coach/videoanalisi` | Eventi di videoanalisi e scaletta | `events` `event_signups` `tests` |
| Allenamento | `/coach/videoanalisi/[id]` | Scaletta di un evento: genera, riordina, ricompatta, pubblica, chiude | `events` `event_signups` `profiles` `runsheet` `signup_tests` |
| Contenuti | `/coach/video` | Coda dei video da analizzare, commenti tecnici, sblocco a pagamento | `race_videos` `video_comments` `profiles` `transactions` |
| Contenuti | `/coach/libreria` | Creazione contenuti e visibilità per livello | `library_items` (0 righe) |
| Contenuti | `/coach/social` | Pianificazione post e insight sui contenuti | `social_posts` (0 righe) `activity_events` `library_items` `profiles` `weekly_feedback` `workout_completions` |
| Business | `/coach/business` | **Ricavi e MRR** (ADR-019), abbonamenti, transazioni, grafico | `transactions` `v_monthly_revenue` `bookings` `package_purchases` `profiles` |
| Comunicazione | `/coach/notifiche` | Avvisi verso i nuotatori | `notifications` |
| Comunicazione | `/coach/chat` | **Segnaposto** — nessuna pagina propria (§2 n. 1) | — |
| Account | `/coach/sicurezza` | Secondo fattore | — |

---

## 6 · Route handler (nessuna interfaccia)

| Rotta | Metodo | Cosa fa | Tabelle |
|---|---|---|---|
| `/api/booking/create` | POST | Prenota: capienza, credito, token. Scrive `bookings` con la service-role (ADR-008) | `bookings` `profiles` + rpc `reserve_lesson_token` `link_lesson_token` `release_lesson_token` |
| `/api/booking/cancel` | POST | Disdetta e restituzione del credito | `bookings` `profiles` |
| `/api/booking/slots` | GET | Fasce prenotabili; filtra le remote con `canBookRemote` | `profiles` |
| `/api/booking/ics` | GET | Calendario della prenotazione | `bookings` |
| `/api/events/signup` | POST | Iscrizione a evento: filtro `audience`, capienza, lista d'attesa | `events` `event_signups` `profiles` `signup_tests` |
| `/api/events/ics` | GET | Calendario dell'evento | `runsheet` |
| `/api/assistant` | POST | Assistente in-app (confine ADR-001) | — |
| `/api/cron/digest` | GET | Digest del lunedì; email simulata senza `RESEND_API_KEY` | `profiles` |
| `/api/cron/video-purge` | GET | Ritenzione video (`lib/retention`) | `race_videos` |
| `/api/version` | GET | Versione del deploy | — |

---

## 7 · Superficie funzionale: le azioni server

91 funzioni `"use server"` in 27 file. È l'elenco delle cose che l'utente può
**fare**, e la verifica più severa per il prototipo: una schermata che non
offre un modo di invocarle perde la funzione anche se la mostra.

**Nuotatore (29).** Readiness: `savePre` `savePost`. Allenamento:
`createSelfWorkout` `updateSelfWorkout` `deleteSelfWorkout`
`saveCompletionEdit` `requestWorkoutChange`. Profilo: `updateProfileName`
`saveProfileBasics` `saveIntake` `setAthleteType` `setOnboardingDone`
`upsertPersonalBest` `editPersonalBest` `deletePersonalBest`. Obiettivi:
`addObjective` `setObjectiveStatus` `deleteObjective`. Video: `registerVideo`
`softDeleteVideo` `undoDeleteVideo` `togglePreserve` `unlockVideo`. Feedback:
`submitWeeklyFeedback`. Legale: `acceptTermsPrivacy`. Abbonamento:
`startActivation` `startEliteActivation` `startEliteSeasonActivation`
`requestLessonPackage`.

**Coach (54).** Agenda e disponibilità: `addRule` `deleteRule` `deleteRules`
`duplicateRuleAllWeek` `duplicateWeekToNext` `closeDay` `addExtra`
`deleteException`. Prenotazioni e cassa: `confirmBooking` `rejectBooking`
`completeBooking` `noShowBooking` `markCollected`. Eventi: `createEvent`
`cancelEvent`. Videoanalisi: `createVideoEvent` `generateRunsheet`
`reorderRunsheet` `recompactRunsheet` `publishRunsheet` `setSignupStatus`
`setRunStatus` `closeVideoEvent`. Nuotatori: `createSwimmer` `updateSwimmer`
`archiveSwimmer`. Percorso: `createProgram` `savePhases` `saveProgramNotes`
`activateProgram` `closeProgram` `duplicateProgram` `deleteProgram`.
Allenamenti: `savePersonalWorkout` `saveOpenWorkout` `updateWorkout`. Video:
`addComment` `markReviewed` `unlockPaidVideo`. Pagamenti e listino:
`markSwimmerPaid` `markPackagePaid` `setGroupLessonAffiliate`
`setExtraLessonPriceOverride` `giftToken`. Libreria: `createLibraryItem`
`updateLibraryItem` `togglePublish` `deleteLibraryItem`. Lead: `createLead`
`setLeadStage` `deleteLead` `convertLead`. Social: `createPost`
`setPostStatus`.

**Comuni (8).** `signIn` `signUp` `signOut` `verifyLoginMfa` `requestReset`
`updatePassword` `markRead` `markAllRead`.

---

## 8 · Le quattro tabelle che il codice non tocca mai

Confronto meccanico tra le 43 tabelle in `public` e ogni `.from(...)` in `src/`.

| Tabella | Righe | Perché |
|---|---|---|
| `subscriptions` | 0 | Eredità Stripe, dismessa da ADR-014. Vedi `docs/GLIDE_MIGRAZIONE_TIER.md` |
| `stripe_events` | 0 | Idem |
| `messages` | 0 | La chat non è implementata (§2 n. 1) |
| `badges` | 0 | I badge non sono implementati (§2 n. 2) |

Tutte le altre 39 tabelle e tutte e 4 le viste hanno almeno un lettore. Non
esiste il caso opposto: nessuna query nel codice punta a una tabella che non
esista in produzione.

---

## 9 · Il gating di livello, per punto di applicazione

Nove punti in tutto. Sono i posti in cui il prototipo deve prevedere uno stato
«bloccato», altrimenti mostra a tutti ciò che non tutti possono avere.

| Punto | Risorsa |
|---|---|
| `app/nuoto/page.tsx` | `open:week` · `open:self` · `open:archive` |
| `app/nuoto/archivio/page.tsx` | `open:archive` |
| `app/nuoto/self-actions.ts` | `open:self` (anche lato server) |
| `app/libreria/page.tsx` | `canOpenLibraryItem` — lucchetto per elemento |
| `app/libreria/[id]/open/route.ts` | `canOpenLibraryItem` — rifiuto lato server |
| `app/video/actions.ts` | `video:review` |
| `app/prenota/page.tsx` | `canBookRemote` — nasconde le sedute remote |
| `api/booking/slots/route.ts` | `canBookRemote` |
| `api/booking/create/route.ts` | `canBookRemote` — rifiuto lato server |

La matrice unica sta in `src/lib/access.ts`. Ogni risorsa gated è applicata due
volte, in UI e lato server: è il contratto che il prototipo eredita.

---

## 10 · Cosa resta da decidere

Non sono correzioni di codice: sono scelte di prodotto che l'inventario mette in
chiaro.

1. **La chat.** Nell'app c'è una voce di menu e una tabella vuota, e nient'altro.
   Va costruita o va tolta la voce — oggi promette al coach una cosa che non
   c'è.
2. **I badge.** Schema pronto da `migration_008`, mai acceso. Se il prototipo
   non li prevede, tanto vale dichiararli fuori e smettere di considerarli
   perdita.
3. **La libreria vuota.** Il sito la vende in tutti e quattro i livelli, l'app ha
   le schermate e zero contenuti. È un problema di contenuto prima che di
   interfaccia.
4. **`/app/[tab]`.** Da cancellare: è morto e confonde chi legge la struttura
   delle rotte per ricostruirla nel prototipo.
