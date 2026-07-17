# GLIDE — Prompt Master v2 · Runbook completo

**File da mettere nella root del repo**

```
GLIDE_ADR.md                       ← vincoli, ADR 001..009
GLIDE_QUESTIONARIO.md
GLIDE_VOICE.md
GLIDE_ONBOARDING.md
GLIDE_GAMIFICATION.md
GLIDE_TIPOGRAFIA.md                ← chiude ADR-009
glide-ext-booking.md
glide-ext-videoanalisi.md
glide-ext-pagamenti.md
migration_001_activity_ledger.sql  ← ⚠️ sostituisce migration_001_events.sql (cancellala)
migration_002_readiness_v2.sql
```

Incolla il blocco sotto in Claude Code, nella root. Ha **cancelli 🛑**: non saltarli.

---

```
═══════════════════════════════════════════════════════════════════
GLIDE — RUNBOOK MASTER v2
═══════════════════════════════════════════════════════════════════
Sei il Lead Software Engineer di GLIDE: piattaforma di coaching per nuotatori Master (40-60 anni).
Coach: Alessio. Esegui le fasi in ordine, dalla 0 alla 9.

MODALITÀ AUTONOMA
  Nessuna conferma per: file, npm, next, git commit, test.
  FERMATI ai cancelli 🛑, e se: manca una chiave, l'azione è distruttiva (DROP/DELETE/force-push),
  servono dati personali.
  Dopo ogni fase: aggiorna STATO.md, committa, 3 righe di stato, prosegui.

GERARCHIA DELLE FONTI — in caso di conflitto:
  1. GLIDE_ADR.md   ← vincolante, vince su tutto
  2. Le spec (QUESTIONARIO, VOICE, ONBOARDING, GAMIFICATION, ext-booking, ext-videoanalisi)
  3. GLIDE_PRODUCT_BIBLE_v1_0.md
  Se una spec contraddice un ADR: vince l'ADR. SEGNALAMI la contraddizione, non risolverla da solo.

═══════════════════════════════════════════════════════════════════
VINCOLI GLOBALI — ogni fase, sempre
═══════════════════════════════════════════════════════════════════
 1. L'AI legge e segnala. NON scrive e NON propone modifiche a workout, volumi, zone, serie,
    recuperi, scarichi, taper. "L'AI adatta l'esperienza del nuotatore. Il coach adatta il carico."
 2. Ogni funzione AI restituisce TESTO. Mai JSON applicabile al DB.
 3. Nessun UUID coach hardcoded nel client. La coach-ness vive solo in is_coach().
    Il coach_id di una prenotazione lo risolve il SERVER, non lo manda il client.
 4. Nessuna query senza filtro utente lato client.
 5. Scale: 5 è SEMPRE meglio. Se scrivi un "6 - x", hai sbagliato la domanda.
 6. readiness_fisica e readiness_mentale NON si mediano MAI in un numero solo.
 7. Il nuotatore non vede MAI il proprio indice di readiness.
 8. Salute: il matcher keyword/chip gira PRIMA del modello. Su un sintomo l'LLM non parte mai.
 9. Nessuno streak. Nessuna classifica. Nessun premio ottenibile allenandosi più del prescritto.
10. Ogni vista SQL: security_invoker = true. Senza, la vista scavalca la RLS.
11. La RLS non è la validazione: è l'ULTIMA LINEA. Se una policy permette di scrivere una riga
    che l'API avrebbe rifiutato, la policy è sbagliata. (ADR-008)
12. Migration nuove: `create table` PURO, mai `if not exists`. Se il nome è preso deve FALLIRE
    rumorosamente. Un errore che tace è peggio di uno che urla. (ADR-007)

═══════════════════════════════════════════════════════════════════
FASE 0 — Setup, lettura, e le TRE CORREZIONI OBBLIGATORIE
═══════════════════════════════════════════════════════════════════
0.1  Verifica i file elencati sopra. Se manca qualcosa: FERMATI.
     Se esiste ancora migration_001_events.sql: CANCELLALA. È sostituita.

0.2  LEGGI PER INTERO, prima di scrivere una riga di codice:
       GLIDE_ADR.md · GLIDE_QUESTIONARIO.md · GLIDE_VOICE.md · GLIDE_ONBOARDING.md
       GLIDE_TIPOGRAFIA.md
     Poi scrivimi 10 righe: quali vincoli hai capito. Se hai frainteso, lo vedo subito.

0.3  ⚠️ TRE CORREZIONI alle spec ext, da applicare PRIMA di eseguirle. Non negoziabili.

  ── CORREZIONE 1 — collisione `events` (ADR-007) ──
  glide-ext-booking §2.6 crea `public.events` = CALENDARIO. Corretto, tienilo.
  Il LEDGER si chiama `activity_events` (migration_001_activity_ledger.sql).
  Due domini diversi: non unirli, non rinominare `events` del calendario.

  ── CORREZIONE 2 — policy bookings (ADR-008) ──
  glide-ext-booking §2.7 dà al NUOTATORE insert/update diretti su `bookings`. È un buco.
  Col client Supabase può: prenotare fuori finestra, azzerare il buffer (block_until = ends_at),
  mettersi payment='free', spostarsi starts_at a piacere.
  L'EXCLUDE constraint NON protegge da questo: impedisce le sovrapposizioni,
  non le prenotazioni inventate.

  SOSTITUISCI con:
    create policy r_book on public.bookings for select to authenticated
      using (swimmer_id = auth.uid() or is_coach());
    create policy c_book on public.bookings for insert to authenticated
      with check (is_coach());
    create policy u_book on public.bookings for update to authenticated
      using (is_coach());

  Ogni prenotazione nasce da /api/booking/create in SERVICE-ROLE, dopo aver RICALCOLATO
  gli slot lato server. La disdetta passa da /api/booking/cancel.
  Stesso principio per event_signups: la capienza si verifica SUL SERVER.
  Una capienza controllata solo lato client non è una capienza.

  TEST OBBLIGATORIO: con un token nuotatore, prova un insert diretto su `bookings`
  via client Supabase. DEVE fallire. Mostrami l'errore. Se passa, la fase non è chiusa.

  ── CORREZIONE 3 — brand e tipografia (ADR-009, DECISO) ──
  glide-ext-booking §0 dichiara Oswald+Montserrat, Ink #0B1220, Teal #0B7A6E.
  È SUPERATO. La fonte è GLIDE_TIPOGRAFIA.md. Leggilo prima di scrivere una riga di CSS.

  Tipografia web: UNA famiglia, DUE pesi — Glacial Indifference 400 e 700.
    - font-weight 300/500/600 sono VIETATI: non esistono nel font, il browser li FINGE
      e il risultato è sporco. Imposta `font-synthesis: none` globalmente.
    - La gerarchia si fa con dimensione, MAIUSCOLO+tracking, e colore. Non col peso.
    - Corpo del testo: 17px MINIMO. Niente sotto i 14px. Nessun grigio sotto il 70%.
      Motivo: i nuotatori hanno 40-60 anni (presbiopia da 42) e leggono a bordo vasca,
      schermo bagnato, luce che sbatte. Non è una preferenza estetica: è leggibilità.
    - Numeri: font-variant-numeric: tabular-nums.
    - VERIFICA a schermo, e riportamela: in "8x50 SL @1'40\" Z2" e in "0O1lI",
      lo 0 si distingue dalla O e l'1 dalla l? Se no, segnalamelo PRIMA dell'editor allenamenti.

  Palette: chiusa, nessun colore nuovo. Il Teal #0B7A6E NON entra.
    vasca = Blu #0E5EAB · remoto = Navy #203979 · evento = bordo Turchese #00FFE6
    NESSUN ROSSO su dati del nuotatore: non esiste uno stato di fallimento (ADR-005).

  Font: woff2 auto-ospitati in /public/fonts + OFL.txt. Mai da CDN o mirror.
  Il LOGO non si tocca: resta com'è (è un'immagine, altra licenza).

0.4  Verifica il remote GitHub (serve per lavorare da mobile). Se manca: FERMATI.
0.5  Crea/aggiorna STATO.md: fasi, stato, cancelli aperti.
0.6  Verifica i nomi REALI delle colonne di `readiness` contro migration_002.
     Adatta i NOMI, mai la logica. Elencami cosa hai cambiato.

═══════════════════════════════════════════════════════════════════
FASE 1 — S6 · Readiness v2 · Digest · Curva            [chiavi Supabase]
═══════════════════════════════════════════════════════════════════
1.1  Esegui migration_002_readiness_v2.sql.
     Verifica security_invoker = true su v_readiness, v_efficiency_points, v_effetto_acqua.
     TEST RLS: con utente nuotatore, `select * from v_readiness` restituisce SOLO le sue righe.

1.2  Questionario v2 (GLIDE_QUESTIONARIO.md alla lettera).
     Ancore VISIBILI mentre si tappa. Stringhe in copy/readiness.it.ts.
     Corpo <= 3 → sede del dolore OBBLIGATORIA.
     Chip "⚠︎ Petto / respiro / testa" → template fisso ADR-004 L2. LLM MAI chiamato.
     Post: RPE ancorato + "E adesso, come stai?" (umore_post) + nota.
     main_set_sig dal set principale. Se non riconoscibile: NULL e avanti.
     Nessuna stima inventata.

1.3  Curva di efficienza. Da v_efficiency_points, raggruppata per main_set_sig.
     < 6 punti validi in 8 settimane → NON mostrare la curva.
     Mai la parola "peggioramento". Se la curva sale, non commentarla.

1.4  Effetto Acqua. Da v_effetto_acqua. Visibile solo con >= 20 sessioni.
     "Sei entrato in acqua 87 volte. 79 volte ne sei uscito meglio di come sei entrato."
     Una frase, grande, sobria. Nessun badge, nessun colore acceso.

1.5  Digest coach — lunedì 07:00, cron Vercel + Resend.
     Manca RESEND_API_KEY → modalità simulata, digest in-app, nessun crash.
     4 sezioni, max 3 righe, OGNI RIGA UN'AZIONE A UN TAP.
     Segnale chiave: readiness_FISICA buona (>=3.5) MA sedute saltate
       → è MOTIVAZIONE, non stanchezza. Etichettalo esplicitamente.
       → serve una telefonata, non un carico più leggero.
     Le bozze contengono OSSERVAZIONI, mai PRESCRIZIONI.

1.6  Onboarding — 6 schermate da GLIDE_ONBOARDING.md, copy IDENTICO.
     Non riscriverlo, non "migliorarlo". La schermata 2 (il patto) NON è skippabile.

─────────────────────────────────────────────────────────────────
🛑 CANCELLO A — TEST B2. Il più importante del progetto.
─────────────────────────────────────────────────────────────────
  A)  sonno 4 · energia 4 · corpo 5 · umore 1 · motivazione 2  → fisica 4.33 · mentale 1.50
  B)  sonno 2 · energia 2 · corpo 1 · umore 5 · motivazione 4  → fisica 1.67 · mentale 4.50

DEVE risultare: A e B appaiono DIVERSI, e A NON genera alcun suggerimento di alleggerire.
Con una media unica darebbero entrambi ~3 e richiedono decisioni OPPOSTE.

Grep in tutto il repo: "readinessIndex" · "readiness_totale" · "6 - " · "6-"
In contesto readiness sono residui del bug. Rimuovili.

FERMATI. Riporta l'esito di B2 e le colonne adattate. Aspetta la mia risposta.
─────────────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════════════════
🛑 FASE 2 — Activity ledger  (ADR-003 — serve il mio GO esplicito)
═══════════════════════════════════════════════════════════════════
Senza GO: SALTA alla FASE 3 e ricordamelo a fine sprint.

Con il GO — esegui migration_001_activity_ledger.sql.
logEvent() in: workout.completed, readiness.pre, readiness.post, video.uploaded, race.logged.
Payload: MAI testo libero, MAI sedi del dolore. Solo has_note e health_flag booleani.
Backfill degli eventi storici dalle sedute già a DB.

Le FASI 3 e 4 aggiungeranno altri tipi (booking.*, event.signup, videoanalisi.done).
Se il ledger esiste quando le esegui, logga anche quelli.

═══════════════════════════════════════════════════════════════════
FASE 3 — S7 · Booking & Agenda                         [chiavi Supabase + Stripe]
═══════════════════════════════════════════════════════════════════
Esegui glide-ext-booking.md CON le tre correzioni della FASE 0.3.

3.1  Migration booking. `events` = calendario (ADR-007). Policy corrette (ADR-008).
     btree_gist + EXCLUDE USING gist su bookings: è la rete contro il doppio-click.

3.2  Slot engine `lib/booking/slots.ts` — funzione PURA.
     I 6 test di §3 devono passare PRIMA di scrivere qualsiasi UI. Non negoziabile:
     un motore di slot sbagliato produce doppie prenotazioni che scopri col cliente
     già in vasca.
     Attenzione al concetto di FINE LAVORI: ultima_partenza = end_time − durata_servizio.

3.3  API routes. /api/booking/slots RICALCOLA lato server: mai fidarsi del client.
     /api/booking/create in service-role, in transazione. Il DB rifiuta → 409.
     ensureCreditPeriod() idempotente, al login e al webhook invoice.paid.
     Stripe non configurato → modalità simulata, payment='free', badge "simulato".

3.4  UI Coach (Agenda, 3 tab) e UI Nuotatore (3 tap).
     Token brand: NON toccarli (ADR-009).

3.5  Timezone Europe/Rome, fissa. Testa il 25/10 e il 29/03 (cambio ora legale).
     Se sbagli qui sbagli due prenotazioni all'anno — e sono quelle che il cliente ricorda.

3.6  Se il ledger esiste: logga booking.created / .completed / .cancelled / .no_show.

3.7  Pagamento diretto (glide-ext-pagamenti.md, ADR-010/011). Aggiunge il metodo `cash`
     a ciò che esiste già — NON riscrive il booking.
     - alter bookings: payment_method, payment_status, amount_cents, receipt_number, paid_at
     - constraint cash_needs_status
     - il passaggio da_incassare → incassato è azione SOLO del coach (la RLS lo impone).
       Il nuotatore NON può marcarsi incassato: provalo, deve fallire.
     - vista "Cassa" nell'Agenda + riga incassi in sospeso nel digest del lunedì (ADR-011)
     - il denaro NON entra mai nel Glide Score né in payload di gamification (ADR-005)
     - NESSUN campo, etichetta o stato pensato per occultare ricavi. Lo strumento traccia,
       non nasconde. La conformità fiscale è del coach: il software resta neutro. (ADR-010 §7)

Collaudo: checklist §9 di glide-ext-booking + §8 di glide-ext-pagamenti, TUTTE.
+ il test della CORREZIONE 2 (insert diretto da nuotatore → deve FALLIRE).

═══════════════════════════════════════════════════════════════════
FASE 4 — S8 · Evento Videoanalisi                      [dipende da FASE 3]
═══════════════════════════════════════════════════════════════════
Esegui glide-ext-videoanalisi.md.

4.1  Migration: alter su `events` (calendario) + tests, event_tests, signup_tests, runsheet.
4.2  Motore scaletta `lib/events/runsheet.ts` — PURO e DETERMINISTICO.
     NON è AI, è aritmetica (coerente con ADR-001: l'ordine lo decide il coach).
     Semaforo di capienza: propone TRE LEVE, non decide da solo.
4.3  Ricalcolo a cascata sul drag&drop, upsert transazionale. Nessun orario scritto a mano.
4.4  runsheet in `draft` → il nuotatore NON vede nulla. Verifica la RLS, non solo la UI.
     Pubblicata → ognuno vede SOLO il suo orario. Mai la scaletta degli altri.
4.5  L'evento oscura l'agenda da starts_at − travel_before a ends_at + travel_after.
     Trasferta a 200 km = giornata bruciata. Lo slot engine deve saperlo.
4.6  Assenza in vista LIVE → la scaletta NON si ricompatta da sola. Bottone esplicito.
4.7  A evento chiuso: le righe 'fatto' entrano nella coda video, taggate event_id + test_code.

Collaudo: checklist §6 di glide-ext-videoanalisi, TUTTA.

═══════════════════════════════════════════════════════════════════
FASE 5 — Onda e Glide Score                            [richiede FASE 2]
═══════════════════════════════════════════════════════════════════
Senza il ledger: salta e segnalalo.

5.1  L'Onda (sostituisce lo streak — VIETATI, ADR-005 §2):
       onda(t) = onda(t-1) * 0.75 + (sedute_completate / sedute_previste) * 25   clamp 0-100
     Non si rompe mai. Nessuno stato rosso. Onda bassa = "acqua calma", non "hai fallito".
     Rientro dopo un mese fermo: "L'acqua è calma. Ricominciamo."
     VIETATI: "streak perso", "ci sei mancato", contatori azzerati.

5.2  Glide Score (0-100), SEMPRE con algo_version:
       Costanza 25 | Onda 20 | Qualità (RPE in banda) 20 | Aderenza 20 | Miglioramento 15
     ZERO performance cronometrica. Max ±3 punti/settimana. In pausa: CONGELATO.
     Mai confrontato con altri nuotatori. Nessuna classifica, da nessuna parte.

TEST: 4 settimane di stop → l'onda SCENDE, non si azzera, non diventa rossa.
      Nuotatore in pausa → Onda e Score CONGELATI.
      Grep: "streak" · "leaderboard" · "classifica" · "record" · "PB"
      → in contesto gamification sono violazioni. Rimuovile.

═══════════════════════════════════════════════════════════════════
FASE 6 — Badge                                         📱 6.1-6.3 senza chiavi
═══════════════════════════════════════════════════════════════════
Prima i CONFERITI, poi gli automatici. Sono i conferiti a dare valore agli automatici.

6.1  UI "Conferisci badge", solo coach: "Capitano" · "Occhio in Acqua".
     Motivazione OBBLIGATORIA, max 140 caratteri. Il nuotatore la vede.
     È quella frase il premio. Il badge è solo la cornice.
6.2  Componenti badge. Distinzione visiva netta conferito/automatico.
     Nessuna emoji, nessun coriandolo. Registro adulto (GLIDE_VOICE.md).
6.3  Badge automatici come FUNZIONI PURE + test — nessun DB:
       Prima Bracciata (primo ciclo COMPLETO pre→seduta→post, NON l'iscrizione)
       Prime Onde · Acqua Calma (premia il RECUPERO) · Metronomo · Tecnico ·
       Costruttore · Onda dopo Onda
     "Instancabile" è ELIMINATO: qualunque criterio, premia il volume → incentivo
     all'infortunio. Se lo trovi nel codice o nella Bible, rimuovilo.
     TEST: nessun badge scatta con readiness_fisica < 3.0.
           Nessun badge né notifica a un nuotatore in pausa. Silenzio rispettoso.
6.4  [chiavi] Collega gli automatici al DB. Assegnazione notturna, idempotente.

═══════════════════════════════════════════════════════════════════
FASE 7 — Assistente                                    📱 7.1-7.2 senza chiavi
═══════════════════════════════════════════════════════════════════
7.1  safety router — funzione PURA, testata, che gira PRIMA di ogni chiamata al modello.

  L2 RED FLAG → bypass TOTALE, notifica immediata al coach:
    petto · torace · fiato · respiro · battito · palpitazioni · vertigini · svenimento ·
    nausea · vista · testa che gira
    → "Fermati. Questi sintomi vanno visti da un medico, non da un'app.
       Se stai male ora, chiama il 112."
    Nessuna domanda di approfondimento. Nessun "probabilmente è nulla".

  L1 MUSCOLOSCHELETRICO → bypass, segnala al coach:
    dolore · male · fitta · infiammazione · tendine · spalla · schiena · ginocchio · gonfiore
    → "Segnalo la cosa ad Alessio. Se il dolore è forte, o non passa in qualche giorno,
       senti un medico prima di tornare in acqua."

  TEST:
    "mi fa male la spalla"       → L1, LLM NON chiamato
    "ho un peso sul petto"       → L2, LLM NON chiamato, coach notificato
    "che allenamento ho domani?" → passa, LLM chiamato
    "sono stanco morto"          → passa (stanchezza != sintomo)
  Se l'LLM parte anche UNA volta su L1/L2: il router è rotto. Non chiudere la fase.

7.2  System prompt dell'assistente (file di testo). Traduci GLIDE_VOICE.md. Deve contenere:
     - Nessun nome, nessuna mascotte. Sei la voce dell'app, non un personaggio.
     - Ogni riconoscimento attribuito ad Alessio: "Alessio ha notato che..."
     - Zero emoji, zero punti esclamativi, zero superlativi. Mai "campione".
     - Ogni affermazione porta un dato. Un complimento senza numero è rumore.
     - Se non sai: "Non ho questo dato. Chiedilo ad Alessio."
     - VIETATO: ridurre, aumentare, saltare, scaricare, suggerire esercizi, interpretare
       sintomi, rassicurare su un sintomo, confrontare con altri, dire che sta peggiorando,
       complimentarsi per aver superato il carico prescritto.
     - Restituisci sempre TESTO. Mai JSON applicabile al DB.

7.3  [chiavi] Collega il modello. Verifica in produzione che su L1/L2 NON parta nessuna
     chiamata API. Loggalo e mostrami la prova.

═══════════════════════════════════════════════════════════════════
🛑 FASE 8 — Identità e Missioni
═══════════════════════════════════════════════════════════════════
NON prima di 8 settimane di dati REALI. Prima sarebbero finte, e un adulto se ne accorge.
Se non ci sono: aggiorna STATO.md e fermati.

═══════════════════════════════════════════════════════════════════
FASE 9 — Collaudo finale
═══════════════════════════════════════════════════════════════════
Checklist B1-B5 di GLIDE_ONBOARDING.md + §9 booking + §6 videoanalisi.

RIPORTA, in questo ordine:
  1. Esito TEST B2 (CANCELLO A)
  2. Esito test insert diretto su bookings (deve FALLIRE)
  3. Colonne DB adattate
  4. Violazioni degli ADR trovate nel codice esistente e cosa hai rimosso
  5. Verifica leggibilità numeri (0/O e 1/l in Glacial Indifference): esito
  6. Cancelli aperti e cosa serve da me
═══════════════════════════════════════════════════════════════════
```

---

## Ordine e dipendenze

| Fase | Cosa | Dove | Blocco |
|---|---|---|---|
| 0 | Setup + 3 correzioni | 🖥 | — |
| 1 | **S6** Readiness · Digest · Curva | 🖥 | 🛑 Cancello A |
| 2 | Activity ledger | 🖥 | 🛑 **serve il tuo GO** |
| 3 | **S7** Booking & Agenda | 🖥 | dipende da 0 |
| 4 | **S8** Videoanalisi | 🖥 | dipende da 3 |
| 5 | Onda + Glide Score | 🖥 | dipende da 2 |
| 6 | Badge | 📱 6.1–6.3 | — |
| 7 | Assistente | 📱 7.1–7.2 | — |
| 8 | Identità · Missioni | 📱 | 8 settimane di dati |
