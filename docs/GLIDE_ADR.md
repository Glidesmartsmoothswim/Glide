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

---

## ADR-013 — Rimozione dei campi dolore strutturati dal readiness

**Stato:** PROPOSTO — 26/08/2026, in attesa di conferma per l'applicazione
**Supersede parzialmente:** il meccanismo "chip readiness" descritto in `GLIDE_QUESTIONARIO.md` v2. Non tocca ADR-004 (matcher chat-based), vedi §Conseguenze.
**Nota sulla numerazione:** questa decisione era stata redatta come "ADR-012", ma quel numero è già in uso nel codice per il builder self-service Canale Open (Onda 29.5 — vedi `src/lib/access.ts`, `src/app/app/nuoto/self-actions.ts`, `migration_037_workouts_self_kind.sql`, `test/security/workouts-self-kind.sql`), mai formalizzato qui ma citato ovunque come esistente. Rinumerata ADR-013 per non collidere.

## Contesto

`GLIDE_SECURITY_AUDIT_v2.md` e la valutazione DPIA hanno evidenziato che `pain_sites` (sede del dolore), `corpo` (scala di intensità del dolore), e i flag derivati `health_flag`/`red_flag` nella tabella `readiness` sono dato sanitario ai sensi dell'art. 4(15)/9 GDPR — indipendentemente dal fatto che l'app non agisca in automatico su questi valori. Il certificato medico è già stato rimosso dal prodotto in una decisione precedente per lo stesso motivo. Si valuta se estendere la minimizzazione al questionario readiness.

## Alternative considerate

1. **Rimuovere solo `pain_sites`** (la sede), tenere `corpo` (l'intensità) e isolare il chip di emergenza. Riduce la granularità ma lascia comunque dato sanitario esplicito: `corpo` è letteralmente una scala "1=Dolore forte…5=Zero dolori".
2. **Rimuovere l'intero blocco dolore** — `pain_sites`, `corpo`, `health_flag`, `red_flag` — nessuna eccezione. Massima minimizzazione; il chip readiness come canale di allerta sparisce.
3. **Non toccare il prodotto**, gestire il rischio solo via DPIA + consenso. Zero impatto su UX, ma non riduce l'impronta dati.

## Decisione

Opzione 2. Rimozione completa del blocco dolore dal questionario readiness, incluso il chip ⚠️ *Petto/respiro/testa* nella sua forma di trigger strutturato via readiness.

## Conseguenze

- `readiness_fisica` passa da 3 componenti (`sonno`, `energia`, `corpo`) a 2 (`sonno`, `energia`). La soglia di filtro della Curva di Efficienza (≥ 3.5, §5 `GLIDE_QUESTIONARIO.md`) resta invariata nella formula ma ora misura solo sonno/energia — da ricalibrare se l'uso reale lo suggerisce.
- **Il matcher L1/L2 di ADR-004 (chat-based, keyword su testo libero) resta attivo e del tutto invariato.** È un sistema separato dal chip readiness: opera su qualunque testo scritto all'assistente AI. Questa decisione elimina il *secondo* canale di trigger (il chip strutturato), non l'unico. Un nuotatore che scrive "dolore al petto" in chat continua a far scattare il template fisso L2 — nessuna perdita lì.
- **Perdita reale:** il chip offriva un tap guidato, senza dover scrivere nulla. Dopo questa modifica, un segnale di dolore passa solo se il nuotatore lo scrive attivamente (chat o nota libera). È un attrito in più sul reporting, non solo una questione di dato — compensato nel copy di onboarding ("se qualcosa non va fisicamente, scrivilo ad Alessio in chat o nella nota").
- **Digest coach:** le sezioni "Da chiamare" (da `red_flag`) e "Corpo" (dolore ricorrente da `pain_sites`) sono state rimosse da `src/lib/digest.ts` insieme alle colonne che le alimentavano — non c'è più dato strutturato da cui derivarle. Il segnale rosso resta comunque immediato: il matcher ADR-004 notifica il coach in tempo reale (`notifyCoaches`) indipendentemente dal digest settimanale.
- **Nota indipendente:** ADR-004 contiene un riferimento ormai obsoleto — *"Il certificato medico resta un gate... scaduto = niente assegnazione carichi"* — dalla rimozione del certificato medico come funzionalità di prodotto (decisione precedente, non di questo ADR). Segnalato qui per traccia; l'aggiornamento di ADR-004 resta fuori scope e richiede approvazione separata.

## Link

`GLIDE_QUESTIONARIO.md` (v3) · `migration_041_readiness_remove_pain_fields.sql` · `PROMPT_CODE_READINESS_V3.md` · `GLIDE_SECURITY_AUDIT_v2.md` §4

---

## ADR-014 — Rimozione Stripe, incasso manuale, gate ad accesso su `payment_status`

**Stato:** PROPOSTO — 28/08/2026 (passa a DECISO solo con conferma esplicita di Alessio, come da protocollo)

**Contesto**
Riunione col commercialista, 28/08/2026: al volume di clienti attuale la gestione Stripe (webhook, conciliazione, quietanze automatiche) aggiunge complessità burocratica senza beneficio proporzionato. Decisione: Stripe esce dal progetto, account in chiusura diretta. In parallelo, `migration_023_pricing_cron` (attivazione tier via cron su evento Stripe) non è mai stata applicata al DB live — il fix previsto per il lancio del 31/08 diventa superfluo: si rimuove il problema invece di risolverlo.

**Alternative considerate**

1. **Fixare il flusso Stripe esistente** (`tier_expires_at`, scadenza calcolata a runtime, niente `pg_cron`).
   Pro: automazione end-to-end, zero lavoro manuale per il coach.
   Contro: commissioni ricorrenti, superficie webhook/conciliazione in più da mantenere, sviluppo aggiuntivo a ridosso del lancio.
2. **Stripe con SEPA Direct Debit** invece di carta (già esplorato in `GLIDE_HANDOFF_PREZZI_FATTURAZIONE`).
   Pro: commissioni dimezzate, incasso resta automatico.
   Contro: mandato da far firmare, incasso in ~5 gg lavorativi, finestra di rimborso "senza motivo" fino a 8 settimane, resta comunque un fornitore terzo con webhook.
3. **Incasso manuale + gate ad accesso su `payment_status`** — scelta.
   Pro: zero commissioni, zero webhook da mantenere, riusa uno schema già esistente e collaudato (ADR-010, modalità `cash`), coerente col volume attuale.
   Contro: lavoro amministrativo ricorrente per il coach, non scala oltre una certa soglia (mitigato sotto, in Conseguenze).

**Decisione**

Stripe esce dal progetto. Nella tabella dei metodi di pagamento di ADR-010, la riga `stripe` viene rimossa; `credit` e `cash` restano, e **`cash` diventa il pattern generico per ogni incasso fuori piattaforma** (bonifico in primis, non solo contanti fisici).

Flusso:
1. Prezzo calcolato (Canale Open flat, 1:1 Elite da questionario) → entitlement in stato `pending_payment`, nessun accesso attivo.
2. Email automatica (Resend): importo, coordinate, causale precompilata.
3. Il coach segna "pagato" nel gestionale → `payment_status = paid` → tier attivo, periodo esteso, trigger opzionale verso Fatture in Cloud.
4. Nessun addebito ricorrente: reminder via email, mai un cron che stacca l'accesso da solo.

Gate ad accesso — degrado progressivo, non switch secco:

| stato | quando | effetto |
|---|---|---|
| `due` | giorno di scadenza | reminder email al nuotatore |
| `grace` | 1–5 gg dopo (`PAYMENT_GRACE_DAYS`) | accesso invariato, banner in-app, coach avvisato nel digest |
| `overdue` | oltre 5 gg | niente nuovo programma/prenotazioni; storico e readiness restano visibili |
| `paid` | coach segna pagato, in ogni momento | accesso ripristinato subito — override sempre disponibile |

**Conseguenze**

- `payment_status`/`da_incassare` (ADR-010) si estende da caso `cash` a flusso universale (`profiles.payment_status`/`tier_expires_at`, `migration_043_manual_payment_gate.sql`) — nuova migration tracciata, non hardcode.
- Digest coach (ADR-011) guadagna una sezione "Pagamenti": nuotatori in `grace`/`overdue` o con richiesta `pending_payment`, azione a un tap.
- `/api/stripe/webhook` **disattivato, non rimosso a DB**: risponde 410, nessuna chiamata SDK Stripe. Nessun `DROP` su `stripe_events`/`subscriptions`/`transactions` — irreversibile e non necessario per il lancio.
- Fatturazione verso Fatture in Cloud (roadmap invariata) cambia trigger: da evento Stripe ad azione "segna pagato" del coach (`triggerInvoicing`, hook documentato, no-op finché non collegata).
- Business/Ricavi (`/coach/business`): MRR e "abbonati attivi" leggevano `subscriptions` (mai più scritta) — ora leggono `profiles.tier`/`tier_expires_at`; il MRR è una stima (un 1:1 stagionale conta come mensile).
- **Soglia di rivalutazione**: quando il carico di solleciti manuali supera una soglia (proposta iniziale, da tarare sui primi mesi: >N solleciti/mese o >X ore/settimana), riaprire questo ADR. SEPA DD resta l'opzione preferita rispetto alla carta se/quando si torna sull'automazione.
- Nessun impatto su ADR-001 (confine AI), ADR-002 (single-coach), ADR-004 (confine sanitario): il gate legge solo `payment_status`/`tier_expires_at`, non tocca dati sanitari né decisioni di carico.

**Link**
Estende ADR-010 (sostituisce la riga `stripe`), ADR-011 (digest). Dettaglio operativo in `GLIDE_HANDOFF_PREZZI_FATTURAZIONE_v2.md`. Sostituisce la "Decisione critica" precedente in `GLIDE_LANCIO_READINESS_31AGO.md`. Implementato in `src/lib/payment/*`, `migration_043_manual_payment_gate.sql`.

---

## ADR-015 — Terzo tier: Base gratuita (prenotazione singola, nessun abbonamento)

**Stato:** ACCETTATO — 28/08/2026 (confermato da Alessio: nessuna scadenza sui token regalati, "lezione di gruppo" va aggiunta al catalogo servizi)

**Contesto**
Emerso durante il redesign della sezione Nuotatori (`GLIDE_mockup_nuotatori_segmenti.html`): esiste una categoria di utenti non coperta dai tier attuali (1:1, Open/Open+) — chi si registra gratuitamente solo per prenotare singole lezioni 1:1 o videoanalisi, senza sottoscrivere programmazione o contenuti.

**Alternative considerate**

1. **Open a €0** — un record `subscriptions` con tier `open`, prezzo zero.
   Pro: riusa esattamente il modello dati Open.
   Contro: semanticamente sbagliato — Open dà accesso a contenuti/canale che questi utenti non devono vedere. Rischio di leak se il gate si basa solo su "esiste una subscription".
2. **Nuova tabella dedicata** (es. `free_accounts`).
   Pro: massima separazione.
   Contro: duplica ownership/RLS già esistenti su `profiles`, aggiunge superficie senza un bisogno reale.
3. **Nessun nuovo record — è lo stato di default** di un `profiles` senza riga attiva in `subscriptions`/`plan_entitlements` — scelta.
   Pro: zero schema nuovo, riusa il flusso pagamento singolo (`cash`/bonifico, ADR-010 esteso da ADR-014) per ogni prenotazione.
   Contro: nessuno — è la lettura più economica dei dati che già esistono.

**Decisione**

Opzione 3, formalizzata: "Base" non è un tier con riga propria: è **l'assenza di un tier attivo** — `profiles.tier = 'free'`, già il default esistente (nessuna migration nuova per questa parte, confermato in Sprint B). Un profilo `swimmer` con tier `free` ha esattamente tre capacità, tutte già coperte da meccanismi esistenti:

1. **Accesso app** — registrazione libera e gratuita, profilo `swimmer` senza subscription attiva. Nessun costo, nessuna carta richiesta all'iscrizione.
2. **Eventi** — iscrizione a `events`/`event_signups` (clinic, gara, trasferta, videoanalisi come tipo evento — ADR-007). Già indipendente da un tier oggi.
3. **Lezioni private** — prenotazione via `bookings`. **Nessun acquisto self-service di token.** Si prenotano e basta: il pagamento di ogni prenotazione è gestito dal coach fuori piattaforma (`cash`/bonifico, flusso manuale ADR-014). Tariffa piena: 35€ lezione singola, 100€ videoanalisi (prezzi "extra fuori piano", `GLIDE_HANDOFF_PREZZI_FATTURAZIONE`).

**Regalo token a discrezione del coach**
I token non si comprano da soli (né per Base né altrove). Il coach può **regalare** token in qualsiasi momento, a qualsiasi nuotatore (Base incluso), spendibili su tre categorie: lezione privata, lezione di gruppo, evento di videoanalisi.

**Implicazione di schema — richiede il GO esplicito di Alessio prima che Claude Code la tocchi.** `lesson_tokens` oggi è scoped a lezioni private (redeem via `migration_024_token_redeem_fns`, RPC `reserve_lesson_token`/`release_lesson_token`). Non copre lezioni di gruppo né eventi videoanalisi. Opzione scelta (coerente con ADR-007): campo `redeemable_for` su `lesson_tokens` (`private_lesson` | `group_lesson` | `videoanalisi_event`), redeem esistente esteso a controllare il match tipo-token/tipo-prenotazione.

**Flusso del regalo** (nessun pagamento coinvolto)
1. Il coach, dalla scheda nuotatore, sceglie "Regala token" → tipo (privata/gruppo/videoanalisi) → quantità.
2. Accredito immediato in `lesson_tokens`, nessuna email di pagamento, nessuna fattura, **nessuna scadenza** (deciso 28/08).
3. Il nuotatore vede il saldo token nella propria app, redimibile sulla prenotazione corrispondente al tipo.

Il confine sanitario (ADR-004, router L1/L2) resta attivo indipendentemente dal tier. Programmazione, Canale Open, readiness/check-in strutturato e Onda/Glide Score restano fuori: presuppongono continuità che un Base, per definizione, non ha.

**Conseguenze**
- L'entitlement check (`my_tier()`/`accessTier`, ADR-014) già restituisce `free` per questi profili — gestionale (segmento "Base gratuito", Sprint B) e swimmer app trattano esplicitamente questo stato come terzo ramo, non come eccezione/errore.
- Gestionale coach: sezione Nuotatori → segmento "Base gratuito" mostra prenotazioni e saldo token (Sprint B, implementato: saldo totale, non ancora per tipo — in attesa di `redeemable_for`).
- Pricing page: quarta voce oltre a 1:1 / Open / Open+ — non è "a partire da X", è "prenota senza abbonarti" (non ancora aggiunta: dipende dal copy definitivo, non bloccante).
- Migration di schema per estendere `lesson_tokens` a gruppo/videoanalisi — **serve il GO esplicito di Alessio**, non coperta dal via libera già dato su ADR-014. Non applicata in questa sessione (Sprint C fermato in attesa del GO).
- "Lezione di gruppo" **non esiste ancora** nel catalogo `services` — va creata come parte dello sprint C.2, prima di poter regalare token di quel tipo.
- Nessun impatto sulle RLS di booking/eventi esistenti: il profilo esiste già, prenotazioni e redeem passano già dall'API server-side (ADR-008).

**Decisioni aperte** (non bloccanti)
- Nome pubblico del tier ("Base gratuito" nel mockup — può cambiare).
- Motivazione obbligatoria sul regalo, visibile al nuotatore.
- Flusso di registrazione: scelta esplicita "solo prenotazioni" o default per chi non seleziona un piano.
- Se anche questi utenti devono vedere l'informativa/patto (schermata 2 onboarding) prima di prenotare.

**Link**
Estende ADR-010/ADR-014 (pagamento singolo), ADR-007 (eventi), ADR-008 (booking solo via API server-side). Schema riusato: `lesson_tokens`, `migration_024_token_redeem_fns`, `bookings`, `events`/`event_signups`. Schema da estendere (in attesa di GO): `redeemable_for` su `lesson_tokens`. Riferimento UI: `GLIDE_mockup_nuotatori_segmenti.html`, implementato in `src/app/coach/nuotatori/nuotatori-segments.tsx`.

---

## ADR-016 — Stato di pagamento derivato, pacchetti lezioni prepagati

**Stato:** ACCETTATO — 05/09/2026 (schema e bonifica dati applicati in produzione lo stesso giorno; formalizzato qui l'08/09/2026, il documento era rimasto indietro rispetto al codice — `lib/payment/status.ts` e `lib/payment/packages.ts` si dichiarano ADR-016 da giorni)

**Contesto**
Il gate di ADR-014 guardava la sola `tier_expires_at`. Non poteva vedere il caso "tier pagante con `payment_status` nullo" — tre profili si erano bloccati esattamente lì. In parallelo serviva un modo di vendere lezioni in blocco senza reintrodurre un incasso automatico.

**Alternative considerate**

1. **Persistere lo stato del gate in colonna**, aggiornato da un cron.
   Pro: lettura banale, una colonna da leggere.
   Contro: due fonti di verità che divergono (la scadenza c'è già), e un cron che declassa l'accesso da solo — esattamente ciò che ADR-014 aveva escluso.
2. **Derivare lo stato da una funzione pura** a ogni lettura — scelta.
   Pro: nessuna colonna che può contraddire sé stessa, la scadenza resta l'unica fonte, nessun cron.
   Contro: il rischio è avere due implementazioni parallele che divergono — mitigato facendo di `lib/payment/status.ts` la sorgente unica del contratto.

**Decisione**

Lo stato di pagamento **è derivato, non persistito**. `profiles.payment_status` resta binario e fattuale (ha pagato / non ha pagato); il gate progressivo (`not_applicable` / `due` / `paid` / `grace` / `overdue`) è una funzione pura di `tier`, `payment_status` e `tier_expires_at`, calcolata una volta per richiesta in `getCurrentProfile`. Ogni lettura che decide **cosa l'utente può fare** passa da lì; le letture che registrano il fatto contabile (importo, ricevuta, data incasso) restano dove sono.

**Pacchetti lezioni prepagati.** Un pacchetto emette token, e un token è credito: non si consegna prima dell'incasso. L'ordine non nasce da un insert del client ma dalla RPC `request_package` (SECURITY DEFINER), che congela l'importo dal listino lato server — così il client non propone il proprio prezzo e un ritocco di listino non altera gli ordini pendenti (ADR-008). L'emissione dei token è un trigger idempotente su `tokens_issued_at`: una seconda marcatura "pagato" non raddoppia il credito. Origine token dedicata: `purchase`.

**Conseguenze**
- Supera il contratto di `lib/payment/gate.ts` (ADR-014).
- Scadenza obbligatoria in "Segna pagato" e guardia sul form nuotatore: erano le due strade da cui nascevano i profili bloccati.
- Gli errori di scrittura sui pagamenti sono visibili e loggati, mai silenziosi (`lib/payment/errors.ts`).
- Le call tecniche sono prenotabili solo col percorso 1:1 attivo, non vendibili a sé.

**Link**
Supera il gate di ADR-014, che resta valido per l'incasso manuale. Riusa `lesson_tokens` (ADR-015) come contenitore del credito. Schema: `lesson_packages`, `package_purchases`, `request_package`, `issue_package_tokens`.

---

## ADR-017 — La capienza sta nel database, il credito non matura da solo

**Stato:** ACCETTATO — 08/09/2026 (lotto `GLIDE_DB_CHANGES_001`, blocchi M1/M3/M4/M5 applicati sul progetto live; M2 e M6 decisi senza toccare lo schema)

**Contesto**
Allineamento prototipo ↔ sistema. Tre divergenze di dato e un bug vivo: il vincolo `cash_needs_status` (migration_011) parlava del solo contante, mentre `payment_method` era stato esteso a `bank_transfer` — il database **rifiutava** una prenotazione saldata per bonifico con stato `da_incassare`. Con l'incasso manuale (ADR-014/016) il bonifico è il metodo principale: senza stato, un incasso non è tracciabile.

**Decisione**

1. **La coerenza del pagamento è una regola sul metodo, non sul contante.** `payment_status_coherent` sostituisce `cash_needs_status`: ogni metodo che si incassa fuori piattaforma — contante **e** bonifico — deve portare uno stato di cassa; `credit`/`token`/`free` no. Il nome del vincolo dice la regola, non il caso particolare che l'ha generata.
2. **La capienza vive in `services.capacity`, non nel codice.** Lezioni di gruppo a 5 (erano 6, valore provvisorio del seed). La regola si scrive su `mode = 'group'`, così un futuro servizio di gruppo la eredita invece di sfuggirle. Il tetto è fatto rispettare dal trigger `bookings_check_capacity` (migration_048), non da un controllo applicativo.
3. **Il credito lezione non matura con l'abbonamento.** Un token si compra (pacchetti, ADR-016) o lo regala il coach (ADR-015), e vale anche col piano Base gratuito. `grant_monthly_tokens()` droppata, e con lei il suo gemello applicativo `lib/entitlements.ts`: **una decisione di questo tipo non è chiusa finché esiste un secondo percorso che fa la stessa cosa**. I token `mensile` non riscattati sono stati cancellati; quello già riscattato resta, è storia legata a una prenotazione.
4. **Una soglia che vive nel giudizio non si mette a schema** (M2). Il minimo di 3 iscritti per una lezione di gruppo resta una regola operativa: nessuna colonna `min_capacity`. Da sola non farebbe nulla — nessun trigger la leggerebbe — e irrigidirebbe una scelta che oggi si prende caso per caso. Si aggiungerà quando servirà un avviso automatico, non prima.
5. **`lesson_credits` resta com'è** (M6). 10 crediti concessi, 2 usati, origine `plan`. Non urgente e non bloccante: si decide se cambia significato (solo call tecniche e check-in Elite), se viene archiviata a favore dei token, o se si accettano due meccanismi paralleli, quando quel flusso avrà una forma.

**Conseguenze**
- Il bonifico è tracciabile a livello di singola prenotazione, ed è **il default** quando la lezione non è coperta da credito o token: il nuotatore sceglie fra bonifico e contanti in vasca, e appena conferma vede IBAN, intestatario e causale. Le coordinate arrivano dalla stessa fonte del flusso abbonamenti (`app_config`, mai in env né nel repo).
- **Le coordinate non restano solo a schermo: partono anche per email**, con il QR EPC069-12 già in uso per gli abbonamenti. Chi prenota dalla vasca paga stasera, e quello che ha letto sullo schermo lo ha perso al primo cambio pagina. Quando la mail non può partire — IBAN non configurato, nuotatore senza email, Resend assente, invio rifiutato — **il coach riceve una notifica con il motivo**: l'unica alternativa accettabile a una mail che non parte è una persona che se ne accorge. La UI, di conseguenza, non promette mai una mail che non è partita.
- **La causale di una lezione non è quella dell'abbonamento.** `bookingCausale` aggiunge la data della lezione all'intestazione fissa: senza, i due incassi arrivano in banca indistinguibili e riconciliarli diventa indovinare.
- L'elenco dei metodi incassati a mano vive in un punto solo (`lib/payment/methods.ts`) ed è dichiaratamente il gemello del vincolo `payment_status_coherent`. Il bug di M3 è nato proprio da due copie della stessa regola che si sono allontanate senza che nessuno se ne accorgesse: finché restano due, almeno stanno una accanto all'altra e il test lo dice.
- Il registro di cassa, il digest degli incassi in sospeso e "Segna incassato" valgono ora su entrambi i metodi, e ognuno dice **quale**: un bonifico si controlla in banca, i contanti si chiedono in vasca. Il ledger registra il metodo reale, non più `cash` fisso — un bonifico segnato come contante è una riga contabile falsa.
- Abbassare una capienza non cancella prenotazioni: quelle esistenti restano valide, si blocca solo l'ingresso di nuove. Con una sessione già oltre il nuovo tetto il risultato sarebbe una sessione congelata sopra capienza — per questo la verifica delle sessioni future è parte della procedura, non un optional.
- `mensile` resta un valore ammesso da `lesson_tokens_source_check`: toglierlo renderebbe non aggiornabile la riga storica che lo usa ancora.

**Link**
Chiude il lotto `GLIDE_DB_CHANGES_001` (M1/M3/M4/M5 applicati, M2/M6 decisi senza modifiche). Corregge il vincolo di ADR-010/migration_011. Estende ADR-014/ADR-016 (incasso manuale) al livello della singola prenotazione. Tocca ADR-015 (token regalati) e migration_046/048 (capienza di gruppo). Migration: `054_payment_status_coherent`, `055_group_capacity_5`, `056_deprecate_monthly_tokens`. Regressione: `test/db/payment-status-coherent.sql`, `test/db/monthly-tokens-deprecated.sql`.

---

## ADR-018 — L'IBAN del coach non sta nell'app: esce solo per email

**Stato:** ACCETTATO — 08/09/2026 (decisione esplicita di Alessio, ribadita: "non voglio assolutamente che il mio IBAN sia pubblicato all'interno della app")

**Contesto**
Le coordinate di incasso (`payment_iban`, `payment_intestatario` in `app_config`) comparivano in tre punti dell'app — riquadro di attivazione/pacchetti (`payment-request-card`), sezione Pagamento del profilo nuotatore, e conferma di prenotazione a bonifico (ADR-017) — più il QR EPC069-12, che **contiene l'IBAN in chiaro** ed era quindi un quarto punto travestito da immagine.

Sotto, la policy RLS `"app_config: lettura" SELECT to public using (true)` rendeva quelle chiavi leggibili da **anon**: la chiave anon è pubblica nel bundle del browser, quindi l'IBAN era di fatto leggibile da chiunque, senza nemmeno registrarsi. La motivazione originale (`bank.ts`: "secondo punto di verifica indipendente dall'email", anti-phishing) era sensata ma pagata troppo cara.

Il rischio non è il prelievo — un addebito SEPA richiede un mandato ed è contestabile — ma l'esposizione di un dato personale del titolare, e la sua concentrazione con gli altri dati dell'app in caso di accesso non autorizzato.

**Alternative considerate**

1. **Solo il QR, senza la riga di testo.** Scartata: il payload EPC contiene l'IBAN in chiaro, qualunque scanner lo legge. Nasconderebbe il dato al titolare, non a un attaccante — e in cambio peggiora la mail (immagini bloccate di default, niente copia-incolla da desktop). Teatro, non sicurezza.
2. **Restringere solo la RLS**, lasciando i riquadri in pagina. Scartata: le pagine leggono lato server e continuerebbero a stampare l'IBAN nell'HTML servito a ogni nuotatore.
3. **Coordinate solo per email** — scelta. Un'email è una comunicazione privata verso un destinatario noto, non un dato pubblicato in un'applicazione. Difesa a due livelli: il dato non entra più nella UI *e* non è più leggibile dai client.

**Decisione**

L'IBAN e l'intestatario **non compaiono in nessuna pagina, in nessuna risposta JSON e in nessun QR renderizzato nell'app**. Escono dal sistema per una strada sola: l'email, con il QR in allegato.

- RLS (`migration_057`): `payment_iban`/`payment_intestatario` leggibili solo dal coach (sono i suoi dati) e dal `service_role`. Le altre chiavi restano leggibili come prima — `payment_grace_days` serve a `derivePaymentGate` a ogni richiesta, e restringere tutta la tabella avrebbe rotto il gate ad accesso in silenzio.
- `bankTransferDetails()` va chiamata **solo** con il client admin: con il client RLS di un nuotatore ora torna `null`, e non è un errore, è la regola.
- Le pagine perdono il riquadro coordinate; restano importo e causale, che sono dati della transazione del nuotatore, non del conto del coach.
- L'acquisto di un pacchetto, che prima mostrava le coordinate **solo** a schermo e non mandava alcuna email, ora ne manda una: togliere il riquadro senza aggiungere l'invio avrebbe lasciato chi compra senza modo di pagare.
- La route di prenotazione non restituisce più le coordinate nel JSON — al client basta sapere se la mail è partita.

**Conseguenze**
- Si perde la verifica anti-phishing in-app. È il prezzo accettato: chi vuole controllare le coordinate lo fa sull'email, oppure chiede al coach.
- Se l'email non parte (IBAN non configurato, destinatario senza indirizzo, Resend assente o che rifiuta) **il nuotatore non ha altra fonte**: per questo il coach riceve una notifica `pay` con il motivo, e la copy non promette mai una mail che non è partita. Vale ora per due flussi, prenotazione e pacchetti.
- `epcQrSvg` resta ma con un avviso esplicito: non va renderizzata in una pagina del nuotatore.
- L'email di attivazione (`request.ts`) era già conforme — mandava le coordinate solo per email — e non è stata toccata.
- Test di regressione con **impersonazione vera** (`test/db/app-config-iban-private.sql`): assume i ruoli `anon` e `authenticated` e legge davvero la tabella. Un controllo sul testo della policy non intercetterebbe una seconda policy permissiva aggiunta accanto, dato che in RLS le policy si sommano in OR.

**Link**
Restringe ADR-016/ADR-017 (incasso manuale) sul canale di comunicazione delle coordinate. Supera la scelta di `PROMPT_CODE_PAGAMENTI` TASK 2 (IBAN in `app_config` a lettura pubblica come secondo punto di verifica). Migration: `057_app_config_iban_private`. Codice: `lib/payment/transfer-email.ts` (ex `booking-transfer.ts`, generalizzato a due flussi), `lib/payment/bank.ts`, `components/payment/payment-request-card.tsx`, `components/booking/swimmer-booking.tsx`, `app/app/profilo/page.tsx`, `app/app/abbonamenti/actions.ts`, `api/booking/create/route.ts`.

---

## ADR-019 — I ricavi si scrivono, e l'MRR si ricava dall'incasso

**Stato:** ACCETTATO — 12/09/2026 (segnalazione di Alessio: "ci sono errori nei ricavi Glide… anche MRR non torna")

**Contesto**

Due errori distinti, che sommati rendevano la sezione Business inservibile proprio dove serve — la riconciliazione del venduto e la soglia forfettario.

**1. I ricavi erano a zero con oltre 1.300€ incassati in stagione.**
`transactions` ha la RLS attiva e **una sola** policy:

```
"transazioni: lettura propria o coach"  SELECT  using (swimmer_id = auth.uid() or is_coach())
```

Nessuna policy `INSERT`. In Postgres questo non significa "tutti possono inserire": significa che **nessuno** può, tranne `service_role`, che è esente da RLS. Con Stripe la cosa funzionava per caso — il webhook girava proprio con quella chiave. Rimosso Stripe (ADR-014), ogni incasso passa dalle azioni del coach, che usano il **client RLS del coach**, non l'admin. Da allora i quattro punti che scrivono un ricavo venivano respinti:

| punto | file | esito |
|---|---|---|
| `markPaid` (abbonamenti) | `lib/payment/request.ts` | insert respinta, **esito non controllato** |
| `markPurchasePaid` (pacchetti) | `lib/payment/packages.ts` | insert respinta, esito già controllato |
| `unlockPaidVideo` (analisi 5€) | `coach/video/actions.ts` | insert respinta, **esito non controllato** |
| `markCollected` (lezioni singole) | `coach/agenda/actions.ts` | **non provava nemmeno** |

Il primo e il terzo sono la parte che fa male: `await supabase.from("transactions").insert(...)` senza guardare `error`. Il piano si attivava, la notifica partiva, il coach vedeva "attivato" — e il ricavo non esisteva. Non c'era nessun segnale, da nessuna parte.

**2. L'MRR sommava un prezzo di listino, non quello che entra.**
Business faceva `MONTHLY_EQUIV[p.tier]` con `TIER_PRICE_CENTS.one_to_one_monthly` = 79€ per ogni 1:1 attivo. Due problemi in uno:

- 79€ non è un prezzo del prezzario in vigore: viene dai vecchi Price ID Stripe, e la matrice di `GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md` v5 non lo contiene (entry 46€, 3 all./sett + check-in mensile in presenza 76€).
- `profiles.tier` è il piano di **accesso** e non distingue mensile da stagionale. Un Pacchetto Stagionale Elite prepagato — 646€ = 760€ × 10 mesi − 15% — vale **64,60€/mese**, non 79€.

Col parco clienti reale del 12/09: MRR mostrato 167,90€, MRR vero 139,10€. Il vecchio commento in pagina chiamava la cosa "approssimazione onesta", ma la sovrastima non era il compromesso dichiarato (stagionale contato come mensile): era un prezzo che nessuno paga.

**Alternative considerate**

1. **Scrivere i ricavi col client admin (`service_role`).** Scartata. Funzionerebbe subito e senza migrazione, ma per farlo bisogna bypassare la RLS da un percorso che non ne ha bisogno: il coach è autenticato, ha già il diritto di registrare un incasso, e la policy è il posto dove quel diritto va scritto. Usare la chiave che ignora le regole al posto di scrivere la regola sposta il problema e lo nasconde meglio.
2. **Una colonna nuova per il periodo di fatturazione** (`payment_period_months`), da cui derivare l'MRR. Scartata per ora: l'informazione **c'è già** in forma contabile — `payment_amount_cents`, `paid_at`, `tier_expires_at`. Una quarta colonna che dice la stessa cosa è una quarta cosa che può divergere dalle altre tre (la lezione di ADR-016 sul gate derivato invece che persistito).
3. **Ricavare il mensile-equivalente dall'incasso** — scelta. Importo realmente incassato ÷ mesi che quel pagamento copre.

**Decisione**

**I ricavi si scrivono, e chi li scrive è il coach.**

- `migration_058`: policy `INSERT` su `transactions` con `with check (is_coach())`. Solo il coach: se un nuotatore potesse inserire, potrebbe dichiarare da sé di aver pagato. `UPDATE` e `DELETE` restano **senza policy**, di proposito — un ricavo registrato non si corregge di nascosto, e la contabilità non ha la gomma.
- Nuovo tipo `'lesson'` nel CHECK su `transactions.type`. Una lezione singola saldata non è un abbonamento: senza un tipo proprio finirebbe etichettata "Abbonamento" e gonfierebbe `v_monthly_revenue.abbonamenti`.
- `markCollected` scrive il ricavo, oltre al ledger che già scriveva.
- **Ogni** insert su `transactions` controlla il proprio esito. L'incasso è già scritto e non si annulla per una riga di contabilità mancante, ma il coach lo viene a sapere: "⚠️ La riga nei ricavi non è stata scritta, va aggiunta a mano".
- Backfill nella stessa migrazione, ricostruito dai dati contabili già presenti (`profiles`, `package_purchases`, `bookings`) e **idempotente**. `created_at` prende `paid_at`, altrimenti un incasso di settembre finirebbe nel mese in cui gira la migrazione. Esclusi gli abbonamenti omaggio (`payment_amount_cents = 0`) e tutto ciò che non ha una data d'incasso accertata: in contabilità non si inventa una data.

**L'MRR si ricava dall'incasso, non dal listino** (`lib/payment/mrr.ts`).

- Mensile-equivalente = `payment_amount_cents ÷ monthsCovered(paid_at, tier_expires_at)`, arrotondato. I mesi si contano sul mese medio gregoriano (365,25/12) e si arrotondano all'intero: le date reali sono negoziate a mano e cadono su giorni di calendario, quindi 03/09 → 30/06 sono 9,86 mesi e vanno letti come 10.
- Il listino resta solo come **ultima spiaggia**, per un profilo attivato a mano senza importo o senza date — e in quel caso la pagina lo dichiara approssimato, invece di far passare il numero per esatto.
- Gli omaggi restano fuori dall'MRR e dentro gli attivi, come già decideva il codice precedente: il servizio lo ricevono davvero, il denaro non entra.

**Conseguenze**

- L'MRR scende da 167,90€ a 139,10€. Non è un peggioramento: è il numero vero.
- Business guadagna "Incassato stagione" (1 lug → 30 giu, la finestra con cui si ragiona sul venduto — distinta dalla soglia forfettario, che resta per anno solare) e "Da incassare", che somma piani richiesti, prenotazioni `da_incassare` e pacchetti messi a `paid` per emettere i token ma con `paid_at` nullo. È la voce che mancava per riconciliare "venduto" con "incassato" senza aprire tre tabelle a mano.
- Un elenco per abbonato mostra importo, mesi coperti e mensile-equivalente: l'MRR è verificabile riga per riga, non un totale da prendere per buono.
- Le lezioni singole entrano nei ricavi e quindi **pesano sulla soglia forfettario**. È corretto e va detto: la percentuale salirà più di prima.
- Il backfill non può ricostruire ciò che non è mai stato registrato. Una lezione venduta e incassata fuori dall'app non ha né booking né importo, e nessuna migrazione la inventa: va inserita a mano.
- Test di regressione con **impersonazione vera** (`test/db/transactions-insert-rls.sql`), stessa logica di ADR-018: assume i ruoli e **scrive davvero**. È esattamente il controllo che mancava — un test che guarda l'elenco delle policy non distingue "policy assente" da "policy presente e permissiva", ed è per questo che il buco è passato inosservato.

**La stagione contabile va dal 1 luglio al 30 giugno**

Prima versione di `seasonWindow`: 1 settembre → 31 agosto. Sbagliata su un caso reale — la lezione Testai del 31/08/2026, che per il coach è "da inizio stagione", cadeva fuori dal totale. La finestra corretta chiude dove chiude `seasonEnd` (30 giugno, unica fonte di verità, non una data ricopiata) e apre il 1 luglio, perché è lì che `seasonEnrollment` apre l'iscrizione **anticipata**: luglio e agosto sono pre-stagione, cioè pagamenti per la stagione che sta per aprirsi. Un incasso di agosto finanzia quella stagione e nei ricavi va contato con lei. Gli allenamenti restano Sett→Giu: questa finestra parla di denaro, non di vasca.

**Correzioni sui dati, applicate il 12/09/2026**

Il backfill non inventa ciò che non è mai stato registrato, ma tre righe erano ricostruibili con certezza una volta chiesto ad Alessio:

1. **Due lezioni singole alle affiliate a 25€**, già incassate e senza alcuna prenotazione a sistema (Testai 31/08, Battaglini 05/09). Registrato il fatto contabile — chi, quanto, quando — senza inventare un orario o un servizio che nessuno aveva registrato. 25€ è la tariffa che il prezzario prevede per i clienti storici (§Extra fuori piano) e che Testai già portava in `extra_lesson_price_override_cents`.
2. **`profiles.service_type` di Battaglini era rimasto `open`** mentre `tier` era `one_to_one` (Pacchetto Stagionale Elite 3+1/mese, 646€ incassati). `plan_entitlements` si legge **per `service_type`**, e `open` concede 0 lezioni/mese: il motore di prenotazione non le ha mai dato il check-in mensile del piano. Corretto a `coaching_1_1`, come Amadio che ha lo stesso piano. È il bug più insidioso dei tre — non si vedeva nei ricavi, si vedeva come una lezione compresa nel piano trasformata in una lezione extra da pagare.
3. **La prenotazione del 12/09 di Battaglini era `cash` / `da_incassare` / 35€**, conseguenza diretta del punto 2: senza credito, il motore l'ha prezzata come lezione extra a listino. Era denaro che non andava chiesto. Riportata a `credit` con il credito di settembre ricostruito e consumato.

Totale ricavi stagione 2026/27 dopo le correzioni: **1.351,90€** — le cinque vendite dichiarate da Alessio, al centesimo (25 + 25 + 646 + 646 + 9,90). "Da incassare" scende a 270€, il solo pacchetto Berti Lorenzi (token già emessi, saldo concordato).

**Link**
Ripara un effetto collaterale di ADR-014 (uscita di Stripe: il webhook `service_role` era l'unico scrittore di `transactions`). Applica a `transactions` la stessa lezione di ADR-016 Task 4 (mai ingoiare l'esito di una scrittura di pagamento) e di ADR-018 (impersonazione vera nei test RLS). Prende dal calcolo derivato di ADR-016 l'idea di non persistere ciò che si può ricavare. Corregge l'uso di `TIER_PRICE_CENTS` come sorgente dell'MRR, introdotto in Sprint C.6. Migration: `058_transactions_insert_rls`. Codice: `lib/payment/mrr.ts` (nuovo), `lib/payment/pricing.ts` (`seasonWindow`), `lib/payment/request.ts`, `app/coach/business/page.tsx`, `app/coach/agenda/actions.ts`, `app/coach/video/actions.ts`. Regressione: `lib/payment/mrr.test.ts`, `test/db/transactions-insert-rls.sql`.
