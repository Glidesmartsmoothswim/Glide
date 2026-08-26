# PROMPT_CODE_FATTURAZIONE — Runbook fatturazione automatica per Claude Code
### GLIDE Suite · webhook dedicato Stripe → Fatture in Cloud · da incollare a blocchi, in ordine

Obiettivo: ogni pagamento online (abbonamento Canale Open, lezione 1-a-1 pagata via Stripe)
genera automaticamente una fattura elettronica su Fatture in Cloud, inviata a SDI, senza
intervento manuale. I pagamenti `cash` (vedi `glide-ext-pagamenti.md`) restano fuori: quelli
li fattura il coach a mano, per scelta architetturale già presa.

> **Regola di questo runbook:** Code costruisce il ponte tecnico. Non decide se un dato fiscale
> serve, non decide diciture normative, non tocca il webhook Stripe esistente per l'entitlement.
> Se manca un dato o un requisito FiC non è chiaro dall'API, si ferma e chiede.

---

## ⛔ COSA CODE NON DEVE FARE

```
VINCOLI PER QUESTA SESSIONE — leggi prima di qualunque cosa.

NON devi:
- modificare app/api/stripe/webhook/route.ts esistente (entitlement/abbonamenti). Questo runbook
  crea un endpoint SEPARATO, non tocca quello.
- decidere se il regime fiscale applicabile è corretto, o quale dicitura normativa usare in fattura:
  usa quella già presente nei documenti FiC esistenti (controllala in F-0, non inventarla)
- decidere se raccogliere codice fiscale / P.IVA del cliente al checkout: è una scelta di prodotto,
  la faccio io. Se scopri che FiC lo richiede per emettere il documento e non lo stiamo raccogliendo,
  FERMATI e segnalamelo — non improvvisare un valore placeholder
- costruire l'autofattura sulle commissioni Stripe (Stripe Ireland Ltd, reverse charge): fuori scope,
  la verifico col commercialista
- gestire fatture per pagamenti `cash`: restano manuali per scelta già presa

DEVI:
- creare un endpoint webhook dedicato, con secret Stripe separato da quello esistente
- scrivere un TEST che dimostri idempotenza (stesso evento due volte → una sola fattura)
- fermarti se un campo richiesto dall'API FiC non è disponibile nei dati che arrivano da Stripe

A fine di ogni prompt: aggiorna STATO.md, fai commit, scrivi 3 righe di stato.
```

---

## PROMPT F-0 — Orientamento

```
Prima di scrivere codice, ispeziona e riferisci in massimo 15 righe:

1. app/api/stripe/webhook/route.ts: quali eventi gestisce oggi (checkout.session.completed,
   customer.subscription.deleted, altri?). NON modificarlo, solo leggerlo.
2. Al momento del checkout (Stripe Checkout Session), quali dati cliente vengono raccolti?
   Email è certa. Nome, indirizzo, codice fiscale/P.IVA: qualcuno di questi è collect_billing_address
   o custom_field già attivo, o serve aggiungerlo?
3. Esiste già un modulo/wrapper per chiamare l'API di Fatture in Cloud da qualche parte nel repo?
   Se sì, dove.
4. Le variabili d'ambiente FIC_API_KEY / FIC_COMPANY_ID (o simili) esistono già in .env.local
   o vanno aggiunte da me?
5. Cerca nella documentazione API di Fatture in Cloud (fatture-in-cloud.it/api-docs o developers.fattureincloud.it)
   quali campi sono OBBLIGATORI per creare un `issued_document` di tipo fattura elettronica verso
   un cliente privato italiano in regime forfettario. In particolare: codice fiscale è obbligatorio
   o opzionale se assente?

Scrivi il risultato in STATO.md, sezione "Fatturazione — orientamento". Non scrivere ancora codice.
Se il punto 5 risulta ambiguo dalla documentazione, segnalalo esplicitamente: è un punto su cui
mi fermo a decidere prima di F-3.
```

### ✅ CHECKLIST TUA — dopo F-0
- [ ] Leggi cosa Code ha trovato su dati raccolti al checkout vs dati richiesti da FiC
- [ ] Se manca il codice fiscale e FiC lo richiede: decidi se aggiungerlo al checkout (Stripe supporta
      `tax_id_collection` e custom fields) — è una tua scelta, non tecnica
- [ ] Recupera **API Key** (o credenziali OAuth2) di Fatture in Cloud e il **Company ID**

---

## PROMPT F-1 — Modulo client Fatture in Cloud

```
MODALITÀ AUTONOMA — solo il wrapper, nessun webhook ancora.

Crea lib/fatture-in-cloud.ts con:

1. Client autenticato verso l'API FiC (usa FIC_API_KEY e FIC_COMPANY_ID da env, mai hardcoded,
   mai NEXT_PUBLIC_).
2. findOrCreateClient({ email, name, taxCode? }): cerca il cliente per email tra i clients FiC;
   se non esiste, lo crea. Ritorna l'id cliente FiC.
3. createInvoice({ clientId, description, amountCents, date }): crea un issued_document di tipo
   fattura, con dicitura regime forfettario (recuperala da un documento FiC esistente in F-0,
   non inventarla), e lo marca per invio a SDI.
4. Gestione errori esplicita: ogni funzione deve poter fallire in modo tracciabile (ritorna
   { ok: false, error } invece di lanciare un'eccezione non gestita nel webhook).

Nessuna chiamata reale in questo step: scrivi anche test/lib/fatture-in-cloud.test.ts con
mock delle risposte HTTP, per verificare che i payload inviati abbiano i campi giusti.

Al termine: commit "feat: wrapper API Fatture in Cloud".
```

---

## PROMPT F-2 — Endpoint webhook dedicato

```
MODALITÀ AUTONOMA.

Crea app/api/webhooks/fatturazione/route.ts — endpoint SEPARATO da /api/stripe/webhook.

1. Verifica firma con RAW body, usando STRIPE_WEBHOOK_SECRET_FATTURAZIONE (secret DIVERSO da
   quello dell'endpoint esistente — sarà un secondo endpoint registrato su Stripe, io lo configuro
   a mano dopo).
2. Ascolta SOLO:
   - `invoice.payment_succeeded` → copre abbonamenti Canale Open, primo ciclo E rinnovi
   - `checkout.session.completed` con `session.mode === 'payment'` → copre lezioni 1-a-1 pagate
     online una tantum (mode `subscription` va IGNORATO qui: il primo pagamento di un abbonamento
     genera comunque un invoice.payment_succeeded, che è già gestito sopra — se non lo escludi,
     rischi due fatture per lo stesso primo pagamento)
3. Idempotenza dedicata — crea la tabella:

   create table if not exists public.invoicing_events (
     id              text primary key,       -- event.id di Stripe
     type            text not null,
     fic_document_id text,
     status          text not null default 'pending' check (status in ('pending','done','failed')),
     error_detail    text,
     created_at      timestamptz not null default now(),
     processed_at    timestamptz
   );

   Inserisci l'event.id PRIMA di processare. Se l'insert fallisce per chiave duplicata, l'evento
   è già in gestione: rispondi 200 e termina.
4. Per ogni evento valido: estrai cliente (email, nome, taxCode se presente) e importo, chiama
   findOrCreateClient + createInvoice da lib/fatture-in-cloud.ts.
5. Su successo: status='done', fic_document_id valorizzato.
   Su fallimento: status='failed', error_detail valorizzato, rispondi comunque 200 a Stripe
   (l'errore è nostro, non va ritentato da Stripe all'infinito) — il retry lo gestisce F-4.

TEST OBBLIGATORIO (test/security/fatturazione-webhook.test.ts):
- POST senza firma → 400
- POST con firma valida, invoice.payment_succeeded → 200, riga invoicing_events con status='done'
- stesso evento inviato due volte → una sola riga, una sola fattura creata (verifica che
  createInvoice sia chiamata UNA sola volta)
- checkout.session.completed con mode='subscription' → NON deve chiamare createInvoice
  (lo gestisce l'invoice.payment_succeeded corrispondente)

Al termine: aggiorna STATO.md, commit "feat: webhook fatturazione dedicato + idempotenza".
```

### ✅ CHECKLIST TUA — dopo F-2
- [ ] **Stripe Dashboard → Webhooks → Aggiungi endpoint**: `https://TUO-URL/api/webhooks/fatturazione`,
      eventi da inviare: `invoice.payment_succeeded`, `checkout.session.completed`. Copia il signing
      secret in `STRIPE_WEBHOOK_SECRET_FATTURAZIONE` (Vercel + `.env.local`)
- [ ] Verifica che l'endpoint ESISTENTE (`/api/stripe/webhook`) non sia stato toccato

---

## PROMPT F-3 — Retry e notifica errori

```
MODALITÀ AUTONOMA.

1. Endpoint interno (protetto da CRON_SECRET, stesso pattern di S-4 del runbook sicurezza)
   che ogni ora rilegge invoicing_events con status='failed' e ritenta createInvoice.
   Dopo 3 tentativi falliti, marca status='failed' definitivo e non ritentare più in automatico.
2. Su fallimento definitivo (3° tentativo), invia una email (Resend) a glide.smartswim@gmail.com:
   "Fattura non generata per [evento] — importo [X] — intervento manuale richiesto."
   Solo l'allerta, MAI dati sanitari o di readiness in questa email (regola già in vigore, S-3).
3. Vista minima in STATO.md o in una pagina admin semplice: elenco invoicing_events con
   status='failed', per controllo manuale rapido.

TEST OBBLIGATORIO: un evento che fallisce 3 volte → email inviata, status='failed' definitivo,
nessun 4° tentativo automatico.

Al termine: aggiorna STATO.md, commit "feat: retry e alert fatturazione fallita".
```

### ✅ CHECKLIST TUA — dopo F-3
- [ ] Verifica in Stripe **test mode**: un abbonamento Open di prova → fattura compare su FiC
- [ ] Verifica una lezione 1-a-1 pagata online di prova → fattura compare su FiC
- [ ] Prova a rompere apposta una chiamata (es. API key sbagliata per un minuto) → arriva l'email di alert

---

## Cosa resta fuori da questo runbook (non è codice, è tuo)

| Punto | Cosa manca | Chi decide |
|---|---|---|
| Codice fiscale al checkout | Se FiC lo richiede e oggi non lo raccogliamo, va aggiunto al form | Tu (prodotto) |
| Autofattura fee Stripe Ireland | Reverse charge sulle commissioni che Stripe addebita a te | Tu + commercialista |
| Dicitura regime forfettario esatta | Va presa da un documento FiC esistente, non inventata da Code | Verifica tua prima di F-1 |
| Pagamenti `cash` | Restano fatturati a mano dal coach (scelta già presa in `glide-ext-pagamenti.md`) | — |

---

*Un incasso senza fattura è un debito che non sai di avere.*
