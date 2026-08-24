# GLIDE — Registro delle Attività di Trattamento (Art. 30 GDPR)

**Documento interno, non pubblico.** Prova di accountability verso il Garante — non va mostrato agli utenti. Aggiornare a ogni cambio di trattamento, fornitore o finalità. Bozza pre-legale: basi giuridiche da confermare con un legale prima di considerarlo definitivo.

**Ultimo aggiornamento:** [data]

---

## Titolare del trattamento

Alessio Coppola — Coach Nuoto (Glide)
P.IVA: 02381880505 · Sede: Via Beato Pio IX n.4, interno 1 — 56043 Fauglia (PI) · Email: glide.smartswim@gmail.com · PEC: coach.coppola@pec.it
DPO: non nominato — non obbligatorio alla dimensione attuale, da rivalutare se cresce il volume di dati sanitari trattati.

---

## 1. Gestione account e servizio di coaching
- **Finalità:** erogazione del servizio, anagrafica cliente
- **Interessati:** clienti/nuotatori registrati
- **Dati:** nome, email, telefono, data di nascita
- **Base giuridica:** contratto (Art. 6.1.b)
- **Destinatari:** Supabase (hosting DB)
- **Trasferimento extra-UE:** no (regione EU confermata)
- **Conservazione:** durata rapporto + 10 anni (obblighi fiscali)
- **Sicurezza:** RLS per-utente, autenticazione, cifratura at-rest

## 2. Fatturazione e pagamenti
- **Finalità:** adempimenti fiscali, incasso
- **Interessati:** clienti paganti
- **Dati:** codice fiscale; dati carta gestiti da Stripe, mai su Glide
- **Base giuridica:** contratto + obbligo di legge
- **Destinatari:** Stripe (titolare autonomo per antifrode)
- **Trasferimento extra-UE:** sì — SCC Stripe
- **Conservazione:** 10 anni
- **Sicurezza:** Stripe Checkout ospitato, nessun campo carta lato Glide

## 3. Readiness (sonno, energia, dolori, umore, motivazione)
- **Finalità:** personalizzazione dell'allenamento
- **Interessati:** clienti attivi
- **Dati:** categoria particolare (Art. 9 — salute)
- **Base giuridica:** consenso esplicito (Art. 9.2.a), separato e revocabile
- **Destinatari:** Supabase; provider LLM (solo segnali pseudonimizzati)
- **Trasferimento extra-UE:** sì per LLM — SCC
- **Conservazione:** 24 mesi, poi aggregazione anonima
- **Sicurezza:** consenso vincolato a livello DB — trigger blocca la scrittura senza consenso attivo

## 4. RPE e note post-sessione
- **Finalità:** tracciamento
- **Interessati:** clienti attivi
- **Dati:** Art. 9 (testo libero)
- **Base giuridica:** consenso esplicito
- **Destinatari:** Supabase
- **Trasferimento extra-UE:** no
- **Conservazione:** 24 mesi
- **Sicurezza:** come punto 3

## 5. Video di allenamento e gara
- **Finalità:** analisi tecnica
- **Interessati:** clienti che caricano video
- **Dati:** Art. 9 + immagine
- **Base giuridica:** consenso dedicato, separato dagli altri
- **Destinatari:** Cloudflare R2
- **Trasferimento extra-UE:** da confermare
- **Conservazione:** 12 mesi, salvo richiesta di conservazione più lunga
- **Sicurezza:** bucket privato, signed URL a scadenza breve

## 6. Chat coach–nuotatore
- **Finalità:** comunicazione e supporto
- **Interessati:** clienti attivi
- **Dati:** Art. 9 di fatto (può contenere contenuti sanitari es. dolori riferiti)
- **Base giuridica:** consenso esplicito
- **Destinatari:** Supabase; provider LLM per l'assistente AI, dopo il router di sicurezza
- **Trasferimento extra-UE:** sì per LLM — SCC, zero retention
- **Conservazione:** 24 mesi
- **Sicurezza:** matcher deterministico prima di ogni chiamata LLM; identità mai inviata insieme al contenuto

## 7. Prenotazioni, allenamenti assegnati, badge
- **Finalità:** erogazione del servizio, gamification
- **Interessati:** clienti attivi
- **Dati:** comuni, non sanitari
- **Base giuridica:** contratto
- **Destinatari:** Supabase
- **Trasferimento extra-UE:** no
- **Conservazione:** durata del rapporto
- **Sicurezza:** RLS, scrittura solo server-side (service-role)

## 8. Test del Nuotatore Master (lead, non ancora clienti)
- **Finalità:** contatto commerciale, qualificazione lead
- **Interessati:** visitatori del sito, non clienti
- **Dati:** fitness/health-adiacenti + email
- **Base giuridica:** consenso (double opt-in)
- **Destinatari:** Supabase (progetto sito, separato dall'app)
- **Trasferimento extra-UE:** no
- **Conservazione:** 24 mesi dall'ultimo contatto, poi cancellazione automatica
- **Sicurezza:** tabella separata dal progetto app, nessuna scrittura incrociata

## 9. Email marketing / newsletter
- **Finalità:** comunicazioni promozionali
- **Interessati:** iscritti opt-in
- **Dati:** email, nome
- **Base giuridica:** consenso (opt-in, revocabile)
- **Destinatari:** Resend
- **Trasferimento extra-UE:** sì — SCC
- **Conservazione:** fino a revoca
- **Sicurezza:** unsubscribe one-click in ogni email; nessun dato sanitario nel corpo email

## 10. Events ledger (storico attività, XP, Glide Score)
- **Finalità:** gamification, dataset longitudinale (ricerca interna)
- **Interessati:** clienti attivi
- **Dati:** pseudonimizzati, nessun testo libero/PII nel payload
- **Base giuridica:** legittimo interesse / consenso ricerca — **da confermare con legale**
- **Destinatari:** Supabase
- **Trasferimento extra-UE:** no
- **Conservazione:** illimitata, solo se pseudonimizzato
- **Sicurezza:** guardia a livello DB che blocca l'inserimento di PII nel payload

---

## Trasferimenti extra-UE — riepilogo

| Fornitore | Regione | Garanzia |
|---|---|---|
| Stripe | USA (infrastruttura) | SCC / DPA Stripe |
| Resend | `[da confermare]` | SCC se extra-UE |
| Provider LLM | USA | SCC, zero data retention |
| Supabase | EU — confermato | — |
| Vercel | EU (funzioni) — da riconfermare | — |
| Cloudflare R2 | `[da confermare]` | — |

---

## Misure di sicurezza generali

- RLS attiva su tutte le tabelle con dati personali
- Ruolo utente non auto-modificabile (protezione da escalation di privilegio)
- Verifica firma sui webhook di pagamento
- Bucket storage privati, mai pubblici
- Cifratura at-rest lato fornitore
- Nessun dato sanitario nei log applicativi o nei corpi email
- Consenso ai dati Art. 9 vincolato a livello database, non solo in UI

---

## Da completare prima che sia valido

- [ ] Confermare regione Resend e Cloudflare R2
- [ ] Base giuridica Events ledger (§11) — conferma legale
- [ ] Valutare nomina DPO se cresce il volume di dati sanitari
- [x] Aggiungere città/CAP alla sede legale — Fauglia (PI), 56043
- [ ] Validazione legale finale

Fonte: mappa dati `GLIDE_PRIVACY_SECURITY_REVIEW.md` §2–3, `GLIDE_SECURITY_AUDIT_v1.md` §4.
