<!-- Destinazione: docs/legal/ · Procedura operativa. Tienila pronta PRIMA di un incidente. -->
# GLIDE — Procedura Data Breach (art. 33/34 GDPR)

> Cosa fare se dati personali vengono esposti, alterati o persi. Il tempo corre da quando **vieni a conoscenza** della violazione: **72 ore** per notificare al Garante, se dovuto. Averla scritta prima è metà del lavoro.

---

## 1. Cos'è una violazione
Qualsiasi evento che comprometta **confidenzialità** (accesso/divulgazione non autorizzati), **integrità** (alterazione), o **disponibilità** (perdita/distruzione) di dati personali. Esempi GLIDE: accesso non autorizzato al DB, video esposti da un link pubblico, service_role trapelata, laptop del coach compromesso, ransomware, invio email a destinatario errato con dati sanitari.

## 2. Ruoli
- **Referente violazioni:** [DA COMPLETARE: Alessio] — riceve, valuta, decide, notifica.
- **Fornitori (responsabili):** per DPA devono avvisarti **senza ingiustificato ritardo** se la violazione avviene da loro. Verifica di avere il loro canale di notifica.

## 3. Flusso operativo

**Passo 1 — Rilevazione e contenimento (subito).**
Blocca la falla: revoca chiavi/sessioni, rendi privato ciò che è esposto, isola il sistema. Annota data/ora in cui ne sei venuto a conoscenza — **da qui partono le 72h**.

**Passo 2 — Valutazione (entro poche ore).**
Rispondi a: quali dati? quante persone? ci sono **dati sanitari**? qual è il rischio per le persone (furto d'identità, discriminazione, danno reputazionale, disagio)?
→ Con dati sanitari coinvolti, il rischio si presume **più alto**.

**Passo 3 — Notifica al Garante (entro 72h), SE la violazione comporta un rischio per i diritti e le libertà.**
Si notifica tramite la **procedura online del Garante**. Se non hai tutto entro 72h, notifica **comunque** ciò che sai e integra dopo. Se decidi di **non** notificare, **motiva e documenta** perché il rischio è improbabile.

**Passo 4 — Comunicazione agli interessati, SE il rischio è ELEVATO.**
Senza ingiustificato ritardo, in linguaggio chiaro: cosa è successo, quali dati, possibili conseguenze, cosa stai facendo, cosa possono fare loro, un contatto. *(Non necessaria se i dati erano cifrati/inintelligibili o se hai adottato misure che azzerano il rischio elevato.)*

**Passo 5 — Registro (sempre, anche se non notifichi).**
Ogni violazione va annotata nel **registro delle violazioni** (§5). È obbligatorio a prescindere dalla notifica.

## 4. Cosa contiene la notifica (art. 33.3)
- Natura della violazione, categorie e numero **approssimativo** di interessati e di record.
- Contatto per informazioni.
- Conseguenze probabili.
- Misure adottate o proposte per rimediare e attenuare.

## 5. Registro delle violazioni (tienilo nel repo/documentale)

| Campo | |
|---|---|
| ID / data-ora conoscenza | |
| Descrizione e causa | |
| Dati e interessati coinvolti | |
| Rischio valutato (basso/elevato) | |
| Notificato al Garante? (sì/no + perché) | |
| Interessati informati? (sì/no) | |
| Misure di contenimento e rimedio | |
| Stato (aperto/chiuso) | |

## 6. Template rapido di notifica interna (il referente compila al Passo 2)
```
Cosa è successo: ...
Quando l'ho saputo (start 72h): ...
Dati coinvolti (sanitari? sì/no): ...
Persone coinvolte (numero stimato): ...
Rischio per le persone (basso/elevato) + perché: ...
Contenimento già fatto: ...
Decisione: notifica Garante? sì/no · informo gli interessati? sì/no
```

---
**Regola d'oro:** nel dubbio sul rischio, **documenta la valutazione**. Ciò che il Garante sanziona più spesso non è l'incidente in sé, ma il **non aver valutato** e il **non aver notificato nei termini**.
