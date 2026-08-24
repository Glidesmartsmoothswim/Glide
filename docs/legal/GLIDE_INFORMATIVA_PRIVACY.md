# GLIDE — Informativa Privacy

**Bozza pre-legale.** Basata sulla mappa dati e le basi giuridiche già definite in `GLIDE_SECURITY_AUDIT_v1.md` e `GLIDE_PRIVACY_SECURITY_REVIEW.md`. Non sostituisce la validazione di un legale/DPO — obbligatoria prima del lancio pubblico (voce G3/G6 del runbook: informativa + DPIA). Campi tra `[ ]` da completare.

**Ultimo aggiornamento:** [data]

---

## 1. Titolare del trattamento

Alessio Coppola — Coach Nuoto (Glide)
P.IVA: 02381880505
Sede: Via Beato Pio IX n.4, interno 1 — 56043 Fauglia (PI)
Email: glide.smartswim@gmail.com
PEC: coach.coppola@pec.it

---

## 2. Dati trattati, finalità, base giuridica, conservazione

| Dato | Finalità | Base giuridica | Conservazione |
|---|---|---|---|
| Nome, email, telefono, data di nascita | Erogazione del servizio | Contratto (Art. 6.1.b) | Durata del rapporto + 10 anni (obblighi fiscali) |
| Codice fiscale | Fatturazione | Obbligo di legge | 10 anni |
| Readiness (sonno, energia, dolori, umore, motivazione) | Personalizzazione dell'allenamento | **Consenso esplicito (Art. 9.2.a)** | 24 mesi, poi aggregazione anonima |
| RPE e note post-sessione | Tracciamento | **Consenso esplicito (Art. 9.2.a)** | 24 mesi |
| Video di allenamento/gara | Analisi tecnica | **Consenso dedicato, separato dagli altri** | 12 mesi, salvo richiesta di conservazione più lunga |
| Messaggi in chat con il coach | Comunicazione e supporto all'allenamento | **Consenso esplicito** (la chat può contenere contenuti sanitari, es. dolori riferiti) | 24 mesi |
| Prenotazioni, allenamenti assegnati, badge | Erogazione del servizio | Contratto | Durata del rapporto |
| Dati di pagamento | Fatturazione | Contratto + obbligo fiscale | Gestiti da Stripe — **non conservati da Glide** |
| Risposte al Test del Nuotatore Master (non ancora cliente) | Contatto commerciale | Consenso (double opt-in) | 24 mesi dall'ultimo contatto, poi cancellazione automatica |
| Email marketing / newsletter | Comunicazioni promozionali | Consenso (opt-in, revocabile) | Fino a revoca |

I dati di categoria particolare (Art. 9 GDPR — readiness, sintomi, certificati medici, video, contenuto sanitario della chat) sono raccolti solo previo **consenso esplicito, specifico per ciascuna finalità, revocabile in ogni momento**, mai richiesto tramite casella pre-selezionata. Il consenso al servizio (contratto) e il consenso ai dati sanitari sono **richiesti separatamente**: rifiutare il secondo non preclude l'uso base del servizio, ma limita la personalizzazione dell'allenamento.

---

## 3. Soggetti che trattano i dati per conto del Titolare

| Fornitore | Funzione | Nota |
|---|---|---|
| Supabase | Database e autenticazione | Regione UE — `[da confermare]` |
| Vercel | Hosting applicativo | Funzioni configurate su regione UE |
| Stripe | Pagamenti | I dati della carta non transitano mai su Glide (Stripe Checkout ospitato) |
| Resend | Invio email transazionali | Regione — `[da confermare]` |
| Cloudflare R2 | Storage dei video | Bucket privato, mai pubblico |
| `[Provider assistente AI]` | Assistente in-app | Riceve solo segnali pseudonimizzati, mai nome/email/data di nascita insieme al contenuto |

Tutti i fornitori operano come responsabili del trattamento (Art. 28 GDPR), con accordo (DPA) sottoscritto o accettato. Per i fornitori con infrastruttura extra-UE si applicano le Clausole Contrattuali Standard (SCC) previste dalla normativa vigente.

---

## 4. Diritti dell'interessato

In qualsiasi momento puoi richiedere:

- accesso ai tuoi dati
- rettifica di dati inesatti
- cancellazione (diritto all'oblio)
- limitazione del trattamento
- portabilità dei dati
- opposizione al trattamento
- revoca del consenso, senza effetto retroattivo su quanto già trattato

Puoi inoltre proporre reclamo al **Garante per la protezione dei dati personali** (www.garanteprivacy.it).

Per esercitare questi diritti: glide.smartswim@gmail.com (o PEC: coach.coppola@pec.it).

---

## 5. Minori

Il servizio è riservato a utenti maggiorenni (18 anni compiuti). Non vengono raccolti né trattati dati di minori.

---

## 6. Sicurezza dei dati

I dati sono protetti con controllo degli accessi basato su ruolo, cifratura a riposo (at-rest) presso i fornitori di infrastruttura, e separazione tecnica tra dati identificativi e dati sanitari dove tecnicamente possibile.

---

## 7. Modifiche a questa informativa

Questa informativa può essere aggiornata. Le modifiche sostanziali saranno comunicate agli utenti attivi prima di diventare efficaci.

---

## Nota interna — cosa manca prima della pubblicazione

Non spuntabile da qui, richiede intervento umano/legale:

- [ ] **DPIA** (Art. 35) — verosimilmente obbligatoria per trattamento su larga scala di dati sanitari + profilazione (Glide Score). Vedi G6.
- [ ] **Registro dei trattamenti** (Art. 30) — non esente, per via dei dati di categoria particolare. Vedi G7.
- [ ] **DPA firmate/accettate** con ognuno dei fornitori in tabella 3. Vedi G4.
- [ ] **Conferma regione EU** di Supabase e Resend. Vedi C3/G5.
- [x] Aggiungere città/CAP alla sede legale — Fauglia (PI), 56043
- [ ] Validazione finale da parte di un legale/DPO prima della pubblicazione pubblica.

Fonte: `GLIDE_SECURITY_AUDIT_v1.md` §4 (G1–G12), `GLIDE_PRIVACY_SECURITY_REVIEW.md` §2–3.
