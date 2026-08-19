<!-- Destinazione nel repo: docs/legal/ · BOZZA di lavoro, da validare con privacy lawyer/DPO.
     Segnaposto [DA COMPLETARE] = dato tuo. [PROPOSTA] = default da confermare. ⚖️ = nodo da far validare. -->
# Informativa sul trattamento dei dati personali
### GLIDE — app di coaching per nuotatori Master · **BOZZA**

> **Nota di lavoro (da rimuovere in pubblicazione).** Questa è una bozza tecnica, non un testo legale definitivo. I punti ⚖️ e i segnaposto vanno completati e validati da un legale/DPO prima della pubblicazione. Un'unica informativa può coprire app e sito, con le differenze segnalate nel testo.

*Ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 (GDPR) e del D.Lgs. 196/2003 come modificato dal D.Lgs. 101/2018.*

---

## 1. Titolare del trattamento
Il titolare è **[DA COMPLETARE: Alessio Coppola / eventuale denominazione]**, **[DA COMPLETARE: P.IVA / C.F.]**, con sede in **[DA COMPLETARE: indirizzo]**.
Per ogni questione relativa ai tuoi dati puoi scrivere a **[DA COMPLETARE: email dedicata, es. privacy@glideswim.it]**.

## 2. Responsabile della protezione dei dati (DPO)
Il titolare **non ha nominato un DPO**, non ricorrendone ad oggi l'obbligo. ⚖️ *Da rivalutare con la crescita del servizio (trattamento sanitario su larga scala).*

## 3. Quali dati trattiamo
- **Dati identificativi e di contatto:** nome, cognome, email, telefono.
- **Dati dell'account e di utilizzo:** credenziali, preferenze, attività nell'app.
- **Dati relativi alla salute (categorie particolari, art. 9 GDPR):** certificato medico sportivo (o sua data di scadenza), dati di *readiness* fisica e mentale, informazioni su dolori/sintomi eventualmente comunicati in chat, video delle sessioni di nuoto ai fini dell'analisi tecnica.
- **Dati di pagamento:** gestiti direttamente dal fornitore di pagamento (Stripe); il titolare **non conserva** i dati della carta.
- **Solo per il sito:** dati inseriti nel *Test del Nuotatore Master* (tempi di gara, parametri di nuotata) e relative inferenze.

## 4. Perché trattiamo i tuoi dati e con quale base giuridica

| Finalità | Base giuridica | Conferimento |
|---|---|---|
| Erogare il servizio di coaching e gestire l'account | Esecuzione del contratto (art. 6.1.b) | Necessario |
| Trattare i tuoi **dati sulla salute** per programmare e seguire l'allenamento | **Consenso esplicito (art. 9.2.a)** | Necessario per il coaching |
| Gestire i pagamenti e gli obblighi fiscali | Contratto + obbligo legale (art. 6.1.b/c) | Necessario |
| Inviarti comunicazioni informative/promozionali (nurture) | **Consenso (art. 6.1.a)** | Facoltativo |
| *(Sito)* Elaborare il Test e ricontattarti | **Consenso (art. 6.1.a / 9.2.a)** | Facoltativo |
| Garantire la sicurezza del servizio e prevenire abusi | Legittimo interesse (art. 6.1.f) | — |

## 5. Dati sulla salute — trattamento specifico
I dati sulla salute sono trattati **esclusivamente sulla base del tuo consenso esplicito**, che puoi **revocare in qualsiasi momento** (vedi §11), senza che ciò pregiudichi la liceità del trattamento precedente. La revoca del consenso ai dati sanitari comporta l'impossibilità di erogare il servizio di coaching, che su tali dati si fonda. I video e i dati di readiness non sono usati per decisioni automatizzate sul carico di allenamento: **le decisioni tecniche sono sempre prese dal coach** (l'assistente digitale legge e segnala, non prescrive).

## 6. Come raccogliamo i dati
Direttamente da te, quando crei l'account, compili i questionari, carichi documenti o video, scrivi in chat o usi il Test sul sito.

## 7. A chi comunichiamo i dati (responsabili del trattamento)
Ci avvaliamo di fornitori che trattano i dati **per nostro conto**, sulla base di appositi accordi (art. 28 GDPR):

| Fornitore | Ruolo |
|---|---|
| Supabase | Database, autenticazione, archiviazione |
| Stripe | Pagamenti |
| Resend | Invio email |
| Cloudflare (R2) | Archiviazione video |
| Vercel | Hosting dell'applicazione |
| **[DA COMPLETARE: eventuale provider AI]** | Assistente digitale (riceve solo dati pseudonimizzati) |

I dati **non vengono venduti** né ceduti a terzi per finalità loro proprie.

## 8. Trasferimenti fuori dall'Unione Europea
Ove possibile i dati sono trattati su server nell'**Unione Europea**. Alcuni fornitori possono trattare dati negli **Stati Uniti**: in tal caso il trasferimento è garantito dalla loro certificazione al **EU-U.S. Data Privacy Framework** e/o dalle **Clausole Contrattuali Standard** approvate dalla Commissione Europea. ⚖️ *Allegare/riferire la mappa trasferimenti aggiornata.*

## 9. Per quanto tempo conserviamo i dati
- **Dati dell'account e sanitari:** per la durata del rapporto e per **[PROPOSTA: 12 mesi]** successivi, salvo obblighi di legge o esercizio/difesa di un diritto.
- **Certificato medico:** fino alla scadenza + **[PROPOSTA: 12 mesi]**, poi cancellato/anonimizzato. ⚖️ *Valutare se conservare il file o la sola data di scadenza.*
- **Dati fiscali:** **10 anni** (obbligo di legge).
- **Consensi marketing / lead / Test:** fino a revoca o **[PROPOSTA: 24 mesi]** di inattività.
Al termine, i dati sono cancellati o resi anonimi.

## 10. Cookie e tecnologie simili
Il sito e l'app usano **cookie tecnici** necessari al funzionamento (es. sessione, autenticazione), per i quali **non è richiesto il consenso**. **[Se attivati]** cookie o strumenti di misurazione non essenziali sono utilizzati **solo previo tuo consenso**, raccolto tramite banner. Il dettaglio è nella **Cookie Policy [link]**. ⚖️ *Sezione da allineare alla scelta analytics: se si adotta una misurazione senza cookie, non serve il banner.*

## 11. I tuoi diritti
Puoi in ogni momento chiedere: **accesso** ai tuoi dati, **rettifica**, **cancellazione**, **limitazione**, **opposizione**, **portabilità**, e **revocare il consenso** prestato. Per esercitarli scrivi a **[DA COMPLETARE: email]**. La revoca del consenso marketing è possibile anche tramite il link di disiscrizione presente in ogni email.

## 12. Reclamo all'Autorità
Se ritieni che il trattamento violi il GDPR, puoi proporre reclamo al **Garante per la protezione dei dati personali** (www.garanteprivacy.it).

## 13. Modifiche
Questa informativa può essere aggiornata. La versione vigente è sempre disponibile su **[link]**.

**Ultimo aggiornamento:** [DA COMPLETARE] · **Versione:** [DA COMPLETARE]
