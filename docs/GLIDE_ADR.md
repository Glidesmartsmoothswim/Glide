# GLIDE — Architecture Decision Records

> Documento vincolante. Ha precedenza sulla Product Bible in caso di conflitto tecnico.
> Ogni prompt a Claude Code deve includere le "Regole vincolanti" in fondo.

---

## ADR-001 — Confine dell'AI

**Stato:** DECISO — 12/07/2026
**Contesto:** la Product Bible attribuisce all'AI il verbo "adattare", ambiguo. Può significare
adattare la *spiegazione* al nuotatore, oppure adattare il *carico di allenamento*.

**Decisione**

L'AI opera su due livelli, e solo due:

| Livello | Cosa fa | Chi decide |
|---|---|---|
| **L0 — Lettura** | Riassume, recupera, cerca nello storico | nessuno |
| **L1 — Segnalazione** | Evidenzia anomalie e pattern al coach | il coach |

Sono **vietati**:
- **L2 su carico** — bozze di allenamento auto-generate
- **L3** — qualsiasi modifica autonoma di volume, intensità, zone, ripetute, recuperi

**Formula canonica (sostituisce "adattare" nella Bible):**

> **L'AI adatta l'esperienza del nuotatore. Il coach adatta il carico.**

**Cosa l'AI PUÒ fare**
- Digest readiness settimanale (*"3 nuotatori con fatica ≥4 per tre giorni"*)
- Coach Memory: recupero osservazioni passate (*"cosa avevo notato su Marco a marzo?"*)
- Spiegare al nuotatore **perché** oggi c'è Z2 e cosa sta costruendo
- Messaggi motivazionali, testi del Glide Journey
- Bozze copy per il feed social

**Cosa l'AI NON PUÒ fare**
- Scrivere o modificare un `workout`
- Proporre di alzare/abbassare metri, serie, zone
- Suggerire scarico, taper, o modifiche in vista di una gara
- Interpretare un dolore o un sintomo

**Motivazioni**
1. **Responsabilità** — il carico su Master 40–60 anni con patologie latenti ha ricadute reali.
   Il coach è tecnico federale; l'AI non ha titolo.
2. **Posizionamento** — Glide vende *il coach amplificato*. Un'AI che scrive allenamenti mette
   Glide in concorrenza con ogni app di training generico: guerra persa, e nessuna differenziazione.
3. **Coerenza** — la Bible già dice "non deve sostituire il coach". Questo ADR ne rende operativo il confine.

**Vincolo implementativo**
- Nessuna funzione AI ha permesso di **INSERT/UPDATE** su `workouts` o tabelle di programmazione.
- Le funzioni AI leggono in sola lettura e restituiscono **testo**, mai payload strutturati
  che il client possa scrivere sul DB senza conferma umana.
- Ogni output AI mostrato al coach porta il disclaimer già presente nel prototipo:
  *"GLIDE non modifica la programmazione: la modulazione del carico resta una tua scelta."*

---

## ADR-002 — Single-coach (niente multi-tenancy)

**Stato:** DECISO — 12/07/2026
**Decisione:** lo schema resta **single-coach**. Nessun `tenant_id`, nessun `coach_id`.

**Contesto:** la Bible prevede SaaS multi-coach dopo 24 mesi. Introdurre il tenant oggi costerebbe
~2h; introdurlo tra 24 mesi con clienti paganti costerebbe settimane e rischierebbe data leak.
Il coach ha scelto di non pagare quel costo ora. **Accettato.**

**Mitigazione — 3 regole non negoziabili**

Servono a mantenere la migration futura a costo *ore* invece che *settimane*.

1. **Mai un UUID coach hardcoded nel client.**
   La "coach-ness" si determina **solo** dentro `is_coach()`. Un punto solo da riscrivere domani.

2. **Ogni riga ha un padrone.**
   Ogni tabella deve avere una FK risolvibile verso un `user_id`. Se domani serve `coach_id`,
   si deriva; non si indovina.

3. **Nessuna query "prendi tutto" senza filtro utente lato client.**
   Anche con un solo coach, la query si scrive come se ce ne fossero dieci.

**Se una di queste tre viene violata, l'ADR-002 va riaperto.**

---

## ADR-003 — Event ledger da V1

**Stato:** IN ATTESA DI GO
**Proposta:** tabella `events` append-only attiva da V1, senza alcuna UI di gamification.

**Costo:** ~10 righe SQL + 5 chiamate a un helper `logEvent()` nei punti già esistenti. 1–2 ore.
**Storage:** ~15.000 righe/anno con 50 nuotatori (~3 MB). Irrilevante.
**Rischio:** zero. Append-only, non tocca logica esistente.

**Perché ora:** XP, Badge e Glide Score sono **funzioni derivate da eventi**. Senza log storico,
in V2 i nuotatori più fedeli ripartono da zero. È l'unica cosa del progetto che, se non si fa ora,
**non si può recuperare dopo**.

**Corollario — Glide Score versionato**
Il punteggio va salvato con `algo_version`. Un indice proprietario che cambia formula fa **scendere
il punteggio a chi non ha sbagliato niente**: il modo più rapido per distruggere la fiducia.
La formula evolve, lo storico resta leggibile.

Migration pronta: `migration_001_events.sql`.

---

## Regole vincolanti — da incollare in ogni prompt a Claude Code

```
VINCOLI ARCHITETTURALI (GLIDE_ADR.md — non derogabili):
1. AI: solo lettura e segnalazione. Nessuna funzione AI può scrivere o proporre
   modifiche a workouts, volumi, zone, serie, recuperi, scarichi o taper.
   "L'AI adatta l'esperienza del nuotatore. Il coach adatta il carico."
2. Nessun UUID coach hardcoded nel client. La coach-ness vive solo in is_coach().
3. Ogni tabella ha una FK risolvibile verso un user_id.
4. Nessuna query senza filtro utente lato client, nemmeno per il coach.
5. Il Glide Score, quando esisterà, si salva sempre con algo_version.
```

---

## ADR-004 — Confine sanitario

**Stato:** DECISO — 12/07/2026
**Contesto:** utenza Master 40–60 anni. Spalle, schiena, cuore. Prima o poi un nuotatore
scriverà nell'app *"ho un dolore alla spalla, riduco?"*. Cosa succede in quel momento non può
dipendere dal buon senso di un modello linguistico.

**Decisione**

GLIDE **non è un dispositivo medico**. L'assistente non diagnostica, non interpreta sintomi,
non rassicura, non minimizza, non consiglia farmaci, esercizi correttivi o riposo.

**Architettura a due livelli — deterministica, non affidata all'AI**

Il testo del nuotatore passa da un **matcher di keyword PRIMA di arrivare al modello**.
Se scatta, il modello **non viene mai chiamato**: risponde un template fisso.
Un LLM non può freelanceare su una risposta che non genera.

**L1 — Muscoloscheletrico**
`dolore · male · fitta · infiammazione · tendine · spalla · schiena · ginocchio · gonfiore`

> Template fisso: registra il segnale, notifica il coach, **non valuta**.
> *"Segnalo la cosa ad Alessio. Se il dolore è forte, o non passa in qualche giorno, senti un medico prima di tornare in acqua."*

**L2 — Red flag (bandiera rossa)**
`petto · torace · fiato · respiro · battito · palpitazioni · vertigini · svenimento · nausea · vista`

> Template fisso, nessuna elaborazione, notifica immediata al coach:
> *"Fermati. Questi sintomi vanno visti da un medico, non da un'app. Se stai male ora, chiama il 112."*
> Nessuna domanda di approfondimento. Nessun *"probabilmente è nulla"*. Nessuna sfumatura.

**Regole assolute**
- L'assistente **non rassicura mai**. "Sarà nulla" / "è normale" / "capita" sono vietati.
- L'assistente **non chiede dettagli clinici**. Non è un triage.
- Il **contenuto** del sintomo non entra mai nella tabella `events`
  (che il coach legge per intero). Solo un flag `health_flag: true`.
- Il **certificato medico** resta un *gate*, non un warning: scaduto = niente assegnazione carichi.
- Ogni bozza di messaggio generata per il coach può contenere **osservazione e incoraggiamento**,
  mai prescrizione. Nessuna bozza dirà "riduci il volume".

---

## ADR-005 — Vincoli di design della gamification

**Stato:** DECISO — 12/07/2026
**Contesto:** i Master hanno già motivazione intrinseca. Aggiungere ricompense estrinseche a
un'attività già amata può **ridurre** la motivazione (overjustification effect). La gamification
su GLIDE quindi non deve *creare* motivazione: deve **proteggerla nei mesi in cui vacilla**
(novembre–febbraio) e **sostenerla nel plateau**, quando il cronometro smette di premiare.

**Vincoli — non derogabili**

1. **Nessun premio ottenibile allenandosi più del prescritto.**
   Un badge che si vince col volume è una macchina per infortuni. Il carico lo dà il coach: superarlo
   non è merito, è indisciplina.

2. **Nessuno streak.**
   Uno streak che si spezza è una punizione, e spinge a nuotare con la spalla infiammata pur di
   non perderlo. Unica meccanica di continuità ammessa: **l'Onda** (media mobile, scende e risale,
   non si rompe mai).

3. **Nessuna classifica tra nuotatori. Mai.**
   Un 42enne e un 58enne su una leaderboard: uno si demoralizza, l'altro non impara niente.
   Ammessa solo l'**appartenenza** (*"34 nuotatori Open hanno completato la serie"*), mai il ranking.

4. **Nessuna metrica di gioco basata sul tempo cronometrico.**
   Il cronometro non premia più un 55enne. Un punteggio che scende perché invecchi è una macchina
   per generare disdette. Il miglioramento si misura in **efficienza**, non in secondi.

5. **Niente XP per login, tempo in app, click, streak di apertura.** (già nella Bible — confermato)

6. **Il Glide Score si muove lentamente: max ±3 punti a settimana.**
   Un punteggio che crolla per un'influenza è un punteggio di cui non ci si fida.

7. **Modalità Pausa: il Glide Score si congela, non scende.**
   Infortunio o malattia dichiarati → il punteggio si ferma. Elimina alla radice l'incentivo perverso
   ad allenarsi malandati per non perdere terreno.

8. **Nessun badge o notifica di gioco a un nuotatore in stato pausa/infortunio.**
   Silenzio rispettoso. Nessun *"ti manchiamo!"*.

9. **I badge conferiti dal coach valgono più di quelli automatici — per design.**
   I badge di giudizio (tecnica, crescita, spirito) li assegna Alessio, non l'algoritmo.
   Sono i più prestigiosi e i più rari. È l'unica cosa che nessun competitor può copiare.

10. **Un badge che prendono tutti non è un badge: è un adesivo.**
    Soglia di design: un badge automatico buono lo ottiene **circa 1 nuotatore su 3**.

---

## ADR-007 — Namespace `events` (collisione risolta)

**Stato:** DECISO — 13/07/2026
**Contesto:** due specifiche hanno rivendicato lo stesso nome di tabella per due domini diversi.

| Tabella | Dominio | Origine |
|---|---|---|
| `activity_events` | **Ledger append-only** — XP, Badge, Glide Score, Glide Journey | ADR-003 |
| `events` | **Calendario** — clinic, gara, trasferta, videoanalisi, chiusura piscina | glide-ext-booking §2.6 |

**Perché era pericolosa.** `migration_001` usava `create table if not exists public.events`.
Se la migration booking gira per prima, la mia **non crea nulla e non solleva alcun errore**:
il ledger non esiste, in silenzio. Te ne accorgi mesi dopo, quando accendi la gamification
e scopri che non c'è storia da ricostruire. Un errore che urla è un problema. Un errore che tace
è un disastro.

**Decisione**
- Il ledger si chiama **`activity_events`**. `migration_001` va rinominata di conseguenza.
- `events` resta al calendario: è il nome naturale di quel dominio, e la videoanalisi ci fa già
  `alter table` sopra.
- **Vietato** `create table if not exists` su tabelle nuove nelle migration future.
  Usare `create table` puro: se il nome è già preso, deve **fallire rumorosamente**.

**Nuovi tipi di evento per il ledger** (da booking/videoanalisi):
```
booking.created · booking.completed · booking.cancelled · booking.no_show
event.signup    · videoanalisi.done
```

---

## ADR-008 — Nessuna scrittura diretta su `bookings` dal client

**Stato:** DECISO — 13/07/2026
**Contesto:** le policy proposte in glide-ext-booking §2.7 consentono al nuotatore
`insert` e `update` diretti su `bookings`.

**Il buco.** Il nuotatore può usare il client Supabase e **scavalcare completamente l'API**:

- prenotare fuori da ogni finestra di disponibilità (le 3 di notte, di domenica)
- impostare `block_until = ends_at`, annullando il buffer tra una lezione e l'altra
- impostare `payment = 'free'` o `'paid'` senza pagare
- in `update`: spostarsi `starts_at` a piacere, o marcarsi `completed`

Il vincolo `EXCLUDE USING gist` **non protegge da questo**: impedisce le sovrapposizioni,
non le prenotazioni inventate. La validazione degli slot vive nell'API, e l'API è aggirabile.

**Decisione**

```sql
-- Il nuotatore LEGGE le sue prenotazioni. Non le scrive.
create policy r_book on public.bookings for select to authenticated
  using (swimmer_id = auth.uid() or is_coach());

create policy c_book on public.bookings for insert to authenticated
  with check (is_coach());          -- ← il resto passa dal server in service-role

create policy u_book on public.bookings for update to authenticated
  using (is_coach());
```

- Ogni prenotazione nasce da `/api/booking/create`, che **ricalcola gli slot lato server**,
  verifica credito o pagamento, e scrive in **service-role**.
- La disdetta passa da `/api/booking/cancel`. Il nuotatore non fa `update` a mano.
- Stesso principio per `event_signups`: la capienza si verifica **sul server**, non nella UI.
  Una capienza controllata solo lato client non è una capienza.

**Regola generale:** se una policy RLS permette a un utente di scrivere una riga che l'API
avrebbe rifiutato, la policy è sbagliata. **La RLS non è la validazione: è l'ultima linea.**

---

## ADR-009 — Sorgente unica del brand · Due tipografie

**Stato:** DECISO — 13/07/2026

**Contesto.** Il brand ha TRE font, e due non sono portabili sul web:

| Font | Ruolo | Licenza web |
|---|---|---|
| Kotex Bold | Titoli | Libreria Canva. Non scaricabile, non auto-ospitabile |
| ITC Franklin Gothic | Titoli/sottotitoli | **Monotype proprietario.** Webfont a pagamento, per dominio, annuale |
| Glacial Indifference | Testi | **SIL OFL** — libero, incorporabile, nostro per sempre |

Canva include i diritti dei font premium nell'abbonamento **solo per i design creati dentro Canva**.
Non esiste un modo di scaricarli. Servire ITC Franklin Gothic da `glideswim.it` senza licenza
Monotype è un illecito, e Monotype fa enforcement.

**Decisione — il brand ha DUE tipografie, non una.** Non è un declassamento: è come funzionano
tutti i brand veri quando il carattere di stampa non è licenziato per il web.

| | Dove vive | Font |
|---|---|---|
| **Statica** | Logo, locandine, social, PDF — tutto ciò che nasce in Canva ed esce come **immagine** | Kotex + ITC Franklin Gothic. Legittimo: il logo è un'immagine, non un webfont |
| **Web** | Sito + PWA + gestionale | **Glacial Indifference**, unica famiglia, due pesi |

**La tipografia web: una famiglia, due pesi.**
Glacial Indifference esiste in **400 e 700**, più il corsivo. Non esistono 300, 500, 600.

- La gerarchia si costruisce con **dimensione, maiuscolo, colore** — non con sei gradazioni di grassetto.
  È più sobrio, più adulto, più Esploratore. Coerente con GLIDE_VOICE.md.
- **`font-weight: 500` e `600` sono VIETATI.** Il browser li *finge* allargando il Regular
  (synthetic bold) e il risultato è sporco. Va imposto `font-synthesis: none`.
- Costo: zero. Rinnovi: zero. Diffide possibili: zero.

**Palette: nessun colore nuovo.** Il Teal `#0B7A6E` proposto da glide-ext-booking non entra.
La distinzione vasca/remoto si fa con la palette ufficiale:
`vasca = Blu #0E5EAB` · `remoto = Navy #203979` · `evento = bordo Turchese #00FFE6`.

Spec completa e token: **`GLIDE_TIPOGRAFIA.md`**.


---

## ADR-010 — Lezione 1-a-1 e pagamento diretto (contanti)

**Stato:** DECISO — 13/07/2026

**Contesto.** Un nuotatore registrato deve poter prenotare una lezione 1-a-1 a pagamento,
oltre ai contenuti inclusi. Non tutti i pagamenti devono passare da Stripe: si vuole ridurre
le commissioni e la dipendenza dal provider, permettendo il saldo diretto col coach.

**Decisione — tre modalità di saldo per una prenotazione a pagamento:**

| `payment_method` | Flusso | Quando |
|---|---|---|
| `credit` | Consuma una lezione inclusa nel pacchetto | il nuotatore ha crediti |
| `stripe` | Stripe Checkout, confermato dal webhook | pagamento a distanza, tracciato dal provider |
| `cash` | **Saldo diretto col coach.** Booking creato in stato `payment_status = da_incassare` | il coach preferisce il contante |

**Il pagamento in contanti è LEGITTIMO e va TRACCIATO, non nascosto.**

Un professionista può incassare in contanti. Ciò che rende un incasso in regola è la **ricevuta**,
non il canale. Quindi la modalità `cash` non è una scorciatoia per non registrare: è un
**registro di cassa**.

Campi del booking in modalità `cash`:
```
payment_method   = 'cash'
payment_status   ∈ { 'da_incassare', 'incassato' }
amount_cents     -- importo dovuto, dal listino services
receipt_number   -- n° ricevuta/fattura, opzionale, compilabile dal coach
paid_at          -- quando il coach segna "incassato"
```

**Cosa il software fa:**
- offre il contante come metodo, riducendo le commissioni Stripe
- tiene il conto di cosa è stato incassato e cosa no (`da_incassare` → il digest lo ricorda al coach)
- lascia spazio al numero di ricevuta

**Cosa il software NON fa, per protezione del coach stesso:**
- non esistono campi, etichette o flag pensati per **occultare** un incasso al fisco
- non esiste un "incasso non registrato" come stato di prima classe
- il gestionale è l'ARCHIVIO del coach: deve poterlo mostrare, non doverlo nascondere

> Un archivio costruito per nascondere ricavi, il giorno di un controllo, è la prova a carico.
> Un archivio pulito è la difesa. Costruiamo il secondo.

**Confine.** La conformità fiscale (emissione ricevuta, dichiarazione, regime forfettario)
è responsabilità del coach e del suo commercialista. GLIDE fornisce lo strumento di tracciamento;
non fornisce, né suggerisce, strategie di evasione.

---

## ADR-011 — Il digest ricorda gli incassi in sospeso

**Stato:** DECISO — 13/07/2026

Estende il digest coach (GLIDE_GAMIFICATION.md §8) con una riga operativa nella sezione § I NUMERI:

> *"3 lezioni da incassare · €130 totali"* → tap: lista delle lezioni `da_incassare`

Motivo: il contante si dimentica. Se il software offre il saldo diretto ma poi non ricorda
al coach cosa deve ancora incassare, il coach perde soldi veri. Questa riga trasforma la modalità
`cash` da buco a registro. Ed è anche la ragione pratica per cui tracciare conviene più che nascondere.
