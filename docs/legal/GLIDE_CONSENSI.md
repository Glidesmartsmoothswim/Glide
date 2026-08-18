<!-- Destinazione nel repo: docs/legal/ · BOZZA. Specifica del blocco consensi (testo + regole + logging).
     Da allineare a migration_004_consents. Validare i testi con legale/DPO. -->
# GLIDE — Blocco consensi (art. 9 GDPR) · **BOZZA**

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
> Acconsento al trattamento dei miei **dati relativi alla salute** (certificato medico, dati di readiness fisica e mentale, eventuali sintomi comunicati in chat) per permettere al coach di programmare e seguire il mio allenamento, come descritto nell'[Informativa]. So che senza questo consenso il servizio di coaching non può essere erogato e che posso revocarlo in ogni momento.

**☐ C2 — Trattamento dei video delle sessioni** *(necessario se usi l'analisi video)*
> Acconsento al caricamento e al trattamento dei **video** delle mie sessioni di nuoto ai fini dell'analisi tecnica da parte del coach.

**☐ C3 — Comunicazioni informative e promozionali** *(facoltativo)*
> Acconsento a ricevere via email comunicazioni su novità, contenuti e iniziative di GLIDE. Posso disiscrivermi in qualsiasi momento dal link presente in ogni email.

### Sito — nel Test del Nuotatore Master

**☐ S1 — Elaborazione del Test e ricontatto** *(facoltativo)*
> Acconsento all'elaborazione dei dati inseriti nel Test (tempi e parametri di nuotata) per ricevere il mio profilo e a essere ricontattato/a da GLIDE via email. Posso revocare il consenso in ogni momento.

*(Nota: sotto ogni gruppo di caselle, un solo pulsante di conferma. L'accettazione di Termini e Informativa è una checkbox distinta, non un consenso al trattamento.)*

---

## 3. Registrazione del consenso (consent log)
Ogni spunta salva un record immutabile (coerente con `migration_004_consents`):

| Campo | Esempio |
|---|---|
| `subject_id` | uuid utente (o email hash per i lead) |
| `consent_key` | `health_data` · `video` · `marketing` · `test_site` |
| `granted` | true/false |
| `text_version` | `v1` (versione del testo mostrato) |
| `granted_at` | timestamp |
| `source` | `app_onboarding` · `site_test` |
| `ip` / `user_agent` | per prova del consenso |
| `withdrawn_at` | timestamp revoca (null se attivo) |

Regole: **append-only** (una revoca è un nuovo record, non un UPDATE distruttivo); il **testo mostrato** va versionato — se cambi il testo, cambia `text_version` e ri-raccogli.

---

## 4. Revoca
- Un pannello "Privacy e consensi" nell'app dove l'utente vede lo stato di ogni consenso e può **revocarlo con un tap**.
- Marketing: revoca anche via **link di disiscrizione** in ogni email (one-click).
- Effetti: la revoca di **C1 (salute)** sospende il coaching (avvisare l'utente prima di confermare); la revoca di **C3 (marketing)** ferma solo le email.
- La revoca **non** cancella i dati già trattati lecitamente: per la cancellazione vale il diritto all'oblio (funzione dedicata).

---

## 5. Cosa NON fare
- Niente casella unica "Accetto tutto".
- Niente caselle pre-spuntate.
- Niente cookie wall né "prosegui = acconsenti".
- Non condizionare il servizio al consenso **marketing**.
- Non riusare un consenso vecchio se hai cambiato il testo: versiona e ri-raccogli.
