<!-- Destinazione nel repo: docs/ o .aios/ · documento di lavoro, NON consulenza legale -->
# GLIDE — Scansione conformità pre-lancio
### Privacy · gestione dati sensibili · sicurezza · esposizione sanzionatoria

> **Scopo.** Verificare cosa deve essere vero **prima del primo utente reale/pagante** per non incappare in sanzioni del Garante, e cosa può seguire.
> **Contesto.** GLIDE tratta dati sanitari (art. 9 GDPR) in modo sistematico. La baseline **tecnica** (S-1…S-4) è chiusa: RLS, role-lock, webhook, storage privato, headers, router. Questa scansione copre il blocco **legale/organizzativo**, che nessun codice può risolvere.
> **Non è consulenza legale.** DPIA, testi di consenso e la valutazione "larga scala/DPO" vanno validati da un privacy lawyer o DPO. Qui c'è la mappa di cosa serve, con priorità.

---

## 0. Verdetto in una riga

Il singolo rischio sanzionatorio maggiore non è tecnico: è **trattare dati sanitari senza una base giuridica valida (consenso esplicito) e senza informativa**. Sistemati quello, la DPIA e i contratti con i fornitori, esci dalla zona "sanzione" ed entri in "buona pratica". Il resto è secondario.

**Esposizione (art. 83 GDPR):** fino a 20M€ o 4% del fatturato — soglie pensate per grandi realtà, ma il Garante sanziona anche piccoli titolari quando mancano **le fondamenta** (base giuridica, informativa, sicurezza) su dati sanitari. Un titolare in buona fede con le fondamenta a posto è in tutt'altra posizione.

---

## 1. 🔴 MANDATORY prima del lancio — le fondamenta

### 1.1 Base giuridica — mappatura (Art. 6 + Art. 9)
Il contratto copre il *servizio*, ma **non basta** per i dati sanitari: serve un titolo Art. 9.

| Trattamento | Base Art. 6 | Base Art. 9 (se sanitario) | Stato |
|---|---|---|---|
| Account & coaching | Contratto | — | ⚠️ da dichiarare in informativa |
| Certificato medico | Obbligo/contratto | **Consenso esplicito** | ⛔ da raccogliere |
| Readiness (fisica/mentale) | Contratto | **Consenso esplicito** | ⛔ da raccogliere |
| Sintomi in chat | Contratto | **Consenso esplicito** | ⛔ da raccogliere |
| Video del nuotatore | Contratto | **Consenso esplicito** (immagine) | ⛔ da raccogliere |
| Pagamenti | Contratto + obbligo fiscale | — | ⚠️ |
| Email marketing / nurture | **Consenso** (opt-in) | — | ⛔ |
| Risultati test (lead) | **Consenso** | fitness/health | ⛔ |

**Azione:** un blocco consensi **granulare, non pre-flaggato, revocabile**, separato dall'accettazione dei termini. Il consenso Art. 9 è il cardine: senza, ogni riga di dato sanitario è trattata illecitamente.
**Sanzione se manca:** la più grave. Trattamento di dati particolari senza base valida.

### 1.2 Informativa (Art. 13) — sito **e** app
Deve contenere: titolare (identità reale + P.IVA + contatto), finalità, basi giuridiche, **destinatari** (Supabase, Stripe, Resend, Cloudflare, Vercel, eventuale LLM), **trasferimenti** extra-UE con garanzia, **retention**, diritti dell'interessato, diritto di **reclamo al Garante**.
**Stato:** ⛔ da redigere. **Sanzione se manca/incompleta:** sì, è tra le più contestate.

### 1.3 DPIA (Art. 35) — **verosimilmente obbligatoria**
Trattamento **sistematico di dati sanitari + profilazione/scoring** (readiness + Glide Score) rientra nei criteri EDPB e nell'elenco del Garante. Non è "se": è "quando", e la risposta è **prima del lancio**.
**Azione:** condurre la DPIA (descrizione trattamenti, necessità/proporzionalità, rischi, misure — molte già implementate in S-1…S-4). Se emerge rischio residuo elevato → consultazione preventiva del Garante.
**Sanzione se manca:** sì, la mancata DPIA quando dovuta è essa stessa una violazione.

### 1.4 Registro dei trattamenti (Art. 30)
L'esenzione piccole realtà **non si applica** con dati particolari → **dovuto**.
**Azione:** registro (anche una tabella) con finalità, categorie di dati/interessati, destinatari, trasferimenti, retention, misure di sicurezza.
**Stato:** ⛔ da creare. **Sanzione se manca:** sì.

---

## 2. 🟠 ALTO — rapporti con i fornitori (prima del lancio)

### 2.1 DPA con i responsabili (Art. 28)
Contratto di responsabile firmato/accettato con **ognuno**: Supabase, Stripe, Resend, Cloudflare, Vercel, eventuale provider LLM. Quasi tutti offrono una DPA standard da accettare in dashboard.
**Stato:** ⚠️ verificare/accettare una per una. **Sanzione se manca:** sì.

### 2.2 Trasferimenti extra-UE (Capo V) — mappa
Preferire **region UE ovunque** (Supabase EU già richiesto in C-3; Vercel function region EU; R2 jurisdiction EU). Per i fornitori USA (Stripe, Resend, eventuale LLM):

- Verificare che siano **certificati DPF** (lista pubblica del Dipartimento del Commercio USA) → oggi copre il trasferimento.
- **Tenere le SCC come fallback documentato:** il DPF è valido ma sotto appello CJEU e con basi indebolite nel 2026. Se cade, le SCC ti coprono senza rifare tutto.
- Produrre una **mappa trasferimenti**: per ogni fornitore → region, se il dato esce dall'UE, garanzia (DPF/SCC).

**Stato:** ⚠️ da mappare. **Sanzione se manca:** trasferimento illecito.

---

## 3. 🟠 ALTO — diritti degli interessati (Art. 15–22)

Devono essere **operabili**, non solo promessi in informativa:
- **Accesso / portabilità** → funzione di export dei dati dell'utente.
- **Cancellazione (oblio)** → flusso di cancellazione/anonimizzazione. Attenzione al ledger append-only: si risolve per **pseudonimizzazione** (distruggere la mappa identità↔soggetto), non cancellando il ledger — coerente con ADR-003/006.
- **Revoca consenso** → deve essere **facile come darlo**; **unsubscribe funzionante in ogni email** Resend (obbligatorio, one-click).
- **Dati fiscali:** restano (obbligo di legge) — vanno esclusi esplicitamente dall'oblio.

**Stato:** export ⛔, cancellazione ⛔ (funzione `forget_subject`, gated sui consensi), unsubscribe ⚠️ da verificare su tutti i template.

---

## 4. 🟠 Gestione dei dati sensibili — trattamento specifico

### 4.1 Certificato medico — minimizzazione (Art. 5)
Decisione aperta: archiviare il **PDF** o solo **data di scadenza + flag validità**? La minimizzazione spinge verso il secondo. Se archivi il file: cifratura at-rest, accesso ristretto al solo coach, **retention** definita (es. cancellazione X mesi dopo scadenza/fine rapporto).
**Sanzione se eccessivo/indefinito:** violazione dei principi di minimizzazione e limitazione della conservazione.

### 4.2 Video — immagine identificabile
Storage privato + signed URL ✅ (già in S-2). Manca il **consenso** al trattamento dell'immagine (§1.1) e la retention del video.

### 4.3 Chat — contenitore di fatto di dati sanitari
"Mi fa male la spalla" è art. 9 anche se sta in `messages`. Trattala come tale: consenso, retention, accesso. Il router (ADR-004) protegge dal lato LLM; la **conservazione** del testo va comunque governata.

### 4.4 Readiness — inferenze sullo stato di salute
Sono dati sanitari inferiti. Coperti dal consenso Art. 9 e dalla regola "mai in chiaro nelle email" (già in S-3).

---

## 5. 🟡 Sicurezza dei dati (Art. 32) — quasi chiusa, residui

La baseline tecnica copre gran parte dell'Art. 32 (cifratura, controllo accessi, RLS, segreti). Residui **non-codice**:

- **Backup testato** (Art. 32(1)(c) ripristino): backup PITR attivo **e un restore provato almeno una volta**. Un backup mai testato non conta.
- **Procedura data breach (Art. 33/34):** avere pronto **prima** il "cosa faccio se". Notifica al Garante **entro 72h**; agli interessati se rischio elevato. Scrivere un runbook di incidente di mezza pagina (chi, cosa, tempi, contatti).
- **Log di accesso** ai dati sanitari, senza registrare PII in chiaro nei log (regola già in S-3).
- **MFA sull'account coach** (vede tutti i dati sanitari) — dashboard.

**Sanzione se manca (dopo un incidente):** la mancata notifica nei termini è sanzionata a sé, oltre al danno.

---

## 6. 🟡 Sito & marketing

### 6.1 Cookie — il discorso completo
Due categorie, due regimi diversi:

- **Cookie tecnici / necessari** (sessione, autenticazione Supabase, bilanciamento, sicurezza) → **nessun consenso richiesto**, ma vanno comunque **dichiarati** in informativa/cookie policy. GLIDE ne ha per forza (l'auth è a cookie): quindi una **disclosure** serve sempre, un **banner** no.
- **Cookie / strumenti NON essenziali** (analytics con cookie tipo GA4, pixel pubblicitari, marketing) → **consenso preventivo obbligatorio** tramite banner.

**Regole del banner (il Garante le fa rispettare):**
- Consenso **preventivo**: nessuno script non essenziale parte **prima** della scelta.
- **Rifiutare deve essere facile come accettare**: pulsante "Rifiuta" allo stesso livello di "Accetta".
- **Granulare** per categoria (niente "accetta tutto" forzato).
- **Niente cookie wall** e niente "continuando a navigare acconsenti": lo scroll **non** è consenso.
- Scelta **revocabile** in ogni momento (link "Preferenze cookie" sempre raggiungibile).
- Durata del consenso limitata (**[PROPOSTA: 6 mesi]**, poi si richiede di nuovo).

**Raccomandazione forte:** adottare **analytics senza cookie** (Plausible, Umami, o Vercel Analytics in modalità senza cookie). Conseguenza: **nessun cookie non essenziale → nessun banner**, solo la disclosure dei cookie tecnici in informativa. Elimini in un colpo il banner, il rischio GA4 (già contestato dal Garante per i trasferimenti USA) e una fonte di attrito sul sito. È la strada più semplice **e** più conforme.

**Cookie Policy:** se resti su soli cookie tecnici, basta una **sezione cookie nell'informativa** (già presente in bozza, §10). Se attivi qualcosa di non essenziale, serve una **Cookie Policy dedicata** con l'elenco puntuale (nome, finalità, durata, fornitore) linkata dal banner.

**Decisione da prendere ora:** analytics cookieless (consigliato, nessun banner) **oppure** analytics con cookie (serve banner conforme + cookie policy). Da questa scelta dipende quanto lavoro front-end serve.

### 6.2 Test & lista email
- **Test del Nuotatore Master:** raccoglie dati fitness/health da **non-clienti** → informativa + consenso **al punto di raccolta**, e consenso separato per il nurture email (non "legittimo interesse").
- **Double opt-in** sulla lista Resend: protegge te e la deliverability.

---

## 7. DPO — serve?

Art. 37: DPO obbligatorio se l'attività **principale** consiste nel trattamento **su larga scala** di dati particolari. Il trattamento sanitario **è** core per GLIDE, ma "larga scala" a livello di lancio (trial 5–8, poi decine) **verosimilmente non è** ancora raggiunta.
**Posizione prudente:** non obbligatorio al lancio; **rivalutare** man mano che cresci (Canale Open, rete coach). La **DPIA resta obbligatoria a prescindere** dal DPO. Far validare questa valutazione da un legale.

---

## 8. Go / No-Go per il primo utente reale

**NON puoi lanciare senza (⛔):**
- [ ] Consenso esplicito Art. 9 (granulare, non pre-flaggato, revocabile)
- [ ] Informativa Art. 13 su sito e app
- [ ] DPIA condotta
- [ ] Registro trattamenti (Art. 30)
- [ ] DPA accettate con tutti i fornitori (Art. 28)
- [ ] Mappa trasferimenti + region UE dove possibile + DPF/SCC per USA
- [ ] Regione Supabase confermata UE (C-3)
- [ ] Unsubscribe funzionante in ogni email
- [ ] Backup PITR + un restore provato
- [ ] Procedura data breach scritta

**Puoi lanciare e completare subito dopo (🟠):**
- [ ] Export dati (portabilità)
- [ ] Cancellazione/pseudonimizzazione (gated sui consensi)
- [ ] Retention certificati/lead/chat + auto-purge
- [ ] MFA coach, log accessi
- [ ] Analytics cookieless o banner conforme

---

## 9. Sequenza consigliata (lead-time reale)

1. **Consulenza privacy + DPIA** — ha il lead-time più lungo: avviala **per prima**. Sblocca informativa e testi consenso.
2. **Informativa + blocco consensi Art. 9** — dipende da (1). È il cardine anti-sanzione.
3. **Registro + mappa trasferimenti + DPA** — lavoro documentale, in parallelo.
4. **`migration_004_consents`** — si applica **solo** quando i testi consenso esistono (era il blocco che tenevi in sospeso).
5. **Diritti operabili** (export/cancellazione) + retention.
6. **Procedura breach + backup provato + MFA**.

---

## 10. In una frase

La sicurezza dei dati (Art. 32) è quasi fatta. Quello che ti separa dal lancio senza rischio sanzione è **carta, non codice**: base giuridica valida per i dati sanitari, informativa, DPIA, registro, contratti con i fornitori. Poca spesa, molto lead-time: partire ora dalla consulenza + DPIA è ciò che sblocca tutto il resto.

---
*GLIDE — Scansione conformità pre-lancio · documento di lavoro, non consulenza legale. Validare DPIA e testi consenso con un privacy lawyer/DPO.*
