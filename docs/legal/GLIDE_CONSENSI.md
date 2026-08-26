<!-- Destinazione nel repo: docs/legal/ · BOZZA. Specifica del blocco consensi (testo + regole + logging).
     Da allineare a migration_004_consents. Validare i testi con legale/DPO.
     v2 — aggiunta C4 (dipendenza da Termini §6) e §6 gate di re-consenso utenti esistenti. -->
# GLIDE — Blocco consensi (art. 9 GDPR) · **BOZZA v2**

> Specifica dei consensi da raccogliere: **testo esatto** delle caselle, **regole** legali/UX, **schema di registrazione**. Allineare alla `migration_004_consents`.

---

## 1. Regole trasversali (non negoziabili)
Un consenso valido è (art. 4.11 e 7 GDPR):
- **Granulare** — una casella per ogni finalità distinta, mai un unico "accetto tutto".
- **Non pre-selezionato** — caselle **sempre vuote** all'apertura.
- **Libero** — il consenso marketing **non** può essere condizione per usare il servizio.
- **Separato** — distinto dall'accettazione di Termini e Informativa.
- **Revocabile** — revocare deve essere **facile come prestare** (§4).
- **Documentato** — ogni consenso registrato con **testo, versione, data/ora** (§3).
- **Informato** — sopra le caselle, link visibile all'**Informativa**.

⚖️ *Nota sul consenso ai dati sanitari:* è **necessario per erogare il coaching** (il servizio si fonda su quei dati). È lecito subordinarvi il servizio, perché il trattamento è realmente indispensabile alla prestazione — ma va tenuto **distinto** dal consenso marketing, che resta libero. Far confermare l'impostazione al legale.

---

## 2. I consensi da raccogliere

### App — in fase di registrazione/onboarding

**☐ C1 — Trattamento dei dati relativi alla salute** *(necessario per il coaching)*
> Acconsento al trattamento dei miei **dati relativi alla salute** (dati di readiness fisica e mentale, eventuali sintomi comunicati in chat) per permettere al coach di programmare e seguire il mio allenamento, come descritto nell'[Informativa]. So che senza questo consenso il servizio di coaching non può essere erogato e che posso revocarlo in ogni momento.

**☐ C2 — Trattamento dei video delle sessioni** *(necessario se usi l'analisi video)*
> Acconsento al caricamento e al trattamento dei **video** delle mie sessioni di nuoto ai fini dell'analisi tecnica da parte del coach.

**☐ C3 — Comunicazioni informative e promozionali** *(facoltativo)*
> Acconsento a ricevere via email comunicazioni su novità, contenuti e iniziative di GLIDE. Posso disiscrivermi in qualsiasi momento dal link presente in ogni email.

### App — al momento della sottoscrizione di un abbonamento *(non onboarding: al checkout)*

**☐ C4 — Attivazione immediata del servizio** *(necessario per attivare subito l'abbonamento)*
> Chiedo espressamente che l'abbonamento venga attivato immediatamente, prima della scadenza del termine di recesso di 14 giorni previsto dalla legge. Prendo atto che questo limita il mio diritto di recesso: nei primi 14 giorni potrò comunque recedere, ma il rimborso sarà proporzionale ai giorni di servizio già goduti, non pieno. Trascorsi i 14 giorni e sui rinnovi successivi, potrò comunque disdire in ogni momento, senza ulteriori addebiti dal periodo successivo.

Testo allineato a Termini §6. **C4 non passa dal log generico del §3** — si registra direttamente sulla riga dell'abbonamento: `subscriptions.withdrawal_waived_at` (timestamp) e `subscriptions.withdrawal_waiver_ip_hash` (prova), colonne già presenti a schema. Un consenso per ogni nuova sottoscrizione, non una tantum sull'account.

### Sito — nel Test del Nuotatore Master

**☐ S1 — Elaborazione del Test e ricontatto** *(facoltativo)*
> Acconsento all'elaborazione dei dati inseriti nel Test (tempi e parametri di nuotata) per ricevere il mio profilo e a essere ricontattato/a da GLIDE via email. Posso revocare il consenso in ogni momento.

*(Nota: sotto ogni gruppo di caselle, un solo pulsante di conferma. L'accettazione di Termini e Informativa è una checkbox distinta, non un consenso al trattamento.)*

---

## 3. Registrazione del consenso (consent log)
Ogni spunta di **C1, C2, C3, S1** salva un record immutabile (coerente con `migration_004_consents`). **C4 è escluso da questo log**, vedi §2 — vive sulla riga `subscriptions`.

| Campo | Esempio |
|---|---|
| `subject_id` | uuid utente (o email hash per i lead) |
| `consent_key` | `health_data` · `video` · `marketing` · `test_site` |
| `granted` | true/false |
| `text_version` | `v1` (versione del testo mostrato) |
| `granted_at` | timestamp |
| `source` | `app_onboarding` · `site_test` · `app_reconsent_existing_user` |
| `ip` / `user_agent` | per prova del consenso |
| `withdrawn_at` | timestamp revoca (null se attivo) |

Regole: **append-only** (una revoca è un nuovo record, non un UPDATE distruttivo); il **testo mostrato** va versionato — se cambi il testo, cambia `text_version` e ri-raccogli.

---

## 4. Revoca
- Un pannello "Privacy e consensi" nell'app dove l'utente vede lo stato di ogni consenso e può **revocarlo con un tap**.
- Marketing: revoca anche via **link di disiscrizione** in ogni email (one-click).
- Effetti: la revoca di **C1 (salute)** sospende il coaching (avvisare l'utente prima di confermare); la revoca di **C3 (marketing)** ferma solo le email.
- La revoca **non** cancella i dati già trattati lecitamente: per la cancellazione vale il diritto all'oblio (funzione dedicata).
- **C4 non si revoca**: è la fotografia di una scelta fatta al momento del checkout su quello specifico abbonamento, non un consenso ricorrente. Non serve un meccanismo dedicato.

---

## 5. Cosa NON fare
- Niente casella unica "Accetto tutto".
- Niente caselle pre-spuntate.
- Niente cookie wall né "prosegui = acconsenti".
- Non condizionare il servizio al consenso **marketing**.
- Non riusare un consenso vecchio se hai cambiato il testo: versiona e ri-raccogli.

---

## 6. Gate di re-consenso per utenti già iscritti

I profili attivi ad oggi si sono registrati **prima** che Informativa e questo blocco consensi esistessero: nessun consenso valido risulta raccolto per i loro dati di categoria particolare (readiness, video, chat). Restano attivi — decisione presa — quindi serve un passaggio di re-consenso, non una nuova iscrizione.

**Meccanismo:** al primo login utile dopo il deploy, prima di qualunque altra schermata, mostra Informativa + le caselle **C1/C2** (C3 resta facoltativo come sempre) in modalità bloccante — l'utente non accede all'app finché non accetta o rifiuta esplicitamente. Il rifiuto di C1 sospende il coaching, stessa conseguenza di un rifiuto in onboarding (§4): comunicalo **prima** della conferma, non dopo.

**Riguarda solo account con ruolo swimmer.** Il coach non è un interessato per questi consensi — è il titolare, non li deve accettare per sé.

**C4 non entra in questo gate**: riguarda solo i dati di categoria particolare già raccolti, non un nuovo acquisto. Si applica normalmente ai *futuri* rinnovi/nuove sottoscrizioni, non retroattivamente su abbonamenti già in corso.

**Log:** stesso schema del §3, con `source: 'app_reconsent_existing_user'` — distinguibile in caso di verifica successiva da un onboarding normale.

**Una tantum per utente:** chi ha già passato il gate non lo rivede, salvo cambio di `text_version` (stessa regola generale del §3).
