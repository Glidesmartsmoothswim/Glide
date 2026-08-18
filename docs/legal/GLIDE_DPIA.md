<!-- Destinazione: docs/legal/ · BOZZA di lavoro. La DPIA va validata e firmata da titolare + legale/DPO.
     ⚖️ = giudizio/firma che spetta a un professionista. [DA COMPLETARE] = dato tuo. -->
# GLIDE — Valutazione d'Impatto sulla Protezione dei Dati (DPIA)
### Art. 35 GDPR · **BOZZA pre-compilata**

> **Perché esiste.** GLIDE tratta dati sanitari in modo sistematico con profilazione (readiness, Glide Score): rientra nei criteri EDPB e nell'elenco del Garante → DPIA **dovuta prima del lancio**.
> **Come usarla.** Le parti fattuali/tecniche sono già compilate (riuso di quanto fatto in S-1…S-4). I ⚖️ sono giudizi che spettano al titolare con un legale/DPO. La firma finale non è tecnica.

**Titolare:** [DA COMPLETARE] · **Data:** [DA COMPLETARE] · **Versione:** 0.1 (bozza) · **Redattore:** [DA COMPLETARE]

---

## 1. Descrizione sistematica del trattamento

**Natura e finalità.** Piattaforma di coaching per nuotatori Master (40–60) che consente al coach di programmare e seguire l'allenamento sulla base di dati fisiologici e di salute. Un assistente digitale **legge e segnala** (non prescrive: ADR-001).

**Categorie di dati.**
- Identificativi/contatto: nome, email, telefono.
- Account/utilizzo.
- **Categorie particolari (art. 9):** certificato medico, readiness fisica/mentale, sintomi in chat, video delle sessioni.
- Pagamenti (gestiti da Stripe; carta non conservata).
- *(Sito)* dati del Test (tempi/parametri di nuotata).

**Interessati.** Nuotatori adulti clienti; lead del sito. *(Servizio rivolto ad adulti — vedi §2 minori.)*

**Destinatari/responsabili.** Supabase, Stripe, Resend, Cloudflare (R2), Vercel, eventuale provider AI (solo dati pseudonimizzati).

**Trasferimenti.** Region UE ove possibile; per fornitori USA → DPF + SCC di fallback (mappa trasferimenti allegata).

**Ciclo di vita.** Raccolta (onboarding/questionari/upload/chat/Test) → uso (programmazione, analisi, segnalazioni) → conservazione (retention §9 informativa) → cancellazione/pseudonimizzazione.

**Tecnologie.** Next.js, Supabase (Postgres+Auth+Storage, RLS), Stripe, Resend, Cloudflare R2, Vercel.

---

## 2. Necessità e proporzionalità

| Requisito | Stato in GLIDE |
|---|---|
| Base giuridica valida | Contratto + **consenso esplicito art. 9** per i dati sanitari (vedi blocco consensi) |
| Minimizzazione | ⚖️ Certificato: valutare "solo scadenza" vs file. Verso l'LLM solo `subject_id` pseudonimo |
| Limitazione finalità | Dati usati solo per coaching; nessun uso secondario non dichiarato |
| Limitazione conservazione | Retention definita in informativa (§9) + auto-purge previsto |
| Esattezza | Dati inseriti dall'interessato; modificabili |
| Trasparenza | Informativa art. 13 (bozza pronta) |
| Diritti degli interessati | Accesso/portabilità/cancellazione/revoca — funzioni in sviluppo |
| Rapporti con responsabili | DPA art. 28 con ogni fornitore (da accettare) |

---

## 3. Valutazione dei rischi per i diritti e le libertà

Tre eventi temuti (metodo per confidenzialità/integrità/disponibilità). Gravità e probabilità: Bassa/Media/Alta.

| # | Evento temuto | Impatto sull'interessato | Minacce principali | Gravità | Probabilità (con misure) | Rischio residuo |
|---|---|---|---|---|---|---|
| R1 | **Accesso illegittimo** a dati sanitari | Elevato (dati particolari, dolori/patologie) | Escalation ruolo · RLS mancante · service_role esposta · storage video pubblico · furto credenziali | Alta | Bassa | ⚖️ **Basso/Medio** |
| R2 | **Modifica indesiderata** dei dati | Medio (programma errato) | Webhook falso · scrittura non autorizzata · bug RLS | Media | Bassa | ⚖️ **Basso** |
| R3 | **Perdita/indisponibilità** dei dati | Medio | Guasto · cancellazione accidentale · ransomware | Media | Bassa | ⚖️ **Basso** |
| R4 | **Uso improprio da parte dell'AI** su tema salute | Elevato (consiglio clinico errato) | LLM su red-flag · dati identificativi verso LLM | Alta | Molto bassa | ⚖️ **Basso** |

---

## 4. Misure a fronte dei rischi (molte già implementate)

| Rischio | Misure | Riferimento |
|---|---|---|
| R1 | Role-lock (policy+trigger) · RLS su ogni tabella · service_role solo server-side · storage privato + signed URL · MFA coach · leaked-password protection | S-1, S-2 / ADR-006 |
| R2 | Webhook Stripe firmato + idempotenza · scritture solo server-side · entitlement solo da Stripe | S-1 |
| R3 | Backup PITR + **restore provato** · region UE · migrazioni tracciate (baseline) | binario umano + S-0.5 |
| R4 | Router deterministico prima dell'LLM · red-flag a template fisso · solo `subject_id` verso LLM | ADR-004, S-4 |
| Trasversali | Security headers · rate limiting · scrubbing PII nei log · "email notifica, non contiene" · pseudonimizzazione per l'oblio | S-2, S-3 |

**Rischio residuo complessivo:** ⚖️ da dichiarare dal titolare. Se, applicate le misure, resta **elevato** → **consultazione preventiva del Garante** (art. 36) prima del trattamento.

---

## 5. Consultazione e pareri
- **Interessati:** ⚖️ valutare se raccogliere il parere (art. 35.9) — per un servizio piccolo, spesso non praticabile: motivare.
- **DPO:** non nominato (⚖️ rivalutare con la crescita).
- **Legale/consulente privacy:** ⚖️ parere sulla validità dell'impianto consensi e sul rischio residuo.

## 6. Esito e decisione
- [ ] Rischio residuo **accettabile** → si procede al lancio.
- [ ] Rischio residuo **elevato** → consultazione preventiva del Garante prima del lancio.
- [ ] Misure aggiuntive richieste: [DA COMPLETARE]

**Firma titolare:** __________ **Data:** ______ · **Parere legale/DPO:** __________

## 7. Revisione
La DPIA si rivede a ogni cambiamento sostanziale (nuove finalità, nuovi dati, nuovi fornitori, incidente rilevante) e comunque almeno **[PROPOSTA: annualmente]**.
