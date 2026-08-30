# GLIDE — Handoff: Prezzario 1:1 e Stripe/Fatturazione
Data: 28/08/2026 · aggiornato 30/08/2026 (v3 — prezzi Open/Open Plus + rinnovo Elite = cadenza check-in)

## 1. ATECO — CHIUSO
Confermato con commercialista: attività rientra interamente nell'ambito consulenza. Nessuna modifica ai codici necessaria.

---

## 2. Prezzario 1:1 — CHIUSO (formule + matrice). Residui non bloccanti in fondo.

### Struttura
Due assi indipendenti + un prodotto a sé:
- **Asse A — canone allenamenti/settimana** (programmazione scritta, floor a 3)
- **Asse B — credito check-in**, due binari per canale — **in presenza** e **remoto (call)** — cadenza scelta dall'atleta (bimestre/mese/bisettimanale/settimana). Stessa cadenza = rinnovo/incasso del piano Elite, nessuna domanda separata nel questionario.
- **Videoanalisi** resta prodotto standalone (100€), non fusa nei crediti check-in

### Formula Asse A — canone/settimana (floor 3)
`A(3) = 44€` · `A(n) = A(3) + Σ(12−k)` per k=4..n
Delta decrescente di 1€ a ogni scaglione (8, 7, 6, 5…): ogni allenamento extra costa un po' meno del precedente — riflette il costo marginale reale, basso e decrescente, di una riga in più su un piano già scritto.

| n. allenamenti | canone/mese |
|---|---|
| 3 (floor) | 44€ |
| 4 | 52€ *(era 54€ reale — scostamento consapevole di −2€/mese, vedi verifica storico)* |
| 5 | 59€ |
| 6 | 65€ |
| 7 | 70€ |

### Formula Asse B — credito check-in (due canali)
`P0` = prezzo/lezione a cadenza mensile = 32€ presenza, 22€ call (entrambi reali, invariati).
- Cadenza ≤ mensile (bimestre): stesso prezzo/lezione della mensile — nessuna economia di scala sotto il mensile, è la stessa unità di consumo distribuita nel tempo.
- Cadenza > mensile: `prezzo/lezione = P0 × (1 − 6% × raddoppi)` — bisettimanale = 1 raddoppio, settimanale = 2 raddoppi.
- Arrotondamento solo sul totale mese-eq finale, mai sul prezzo/lezione intermedio (evita doppio arrotondamento).

| cadenza | lezioni/mese | in presenza | remoto (call) |
|---|---|---|---|
| bimestre | 0,5 | 32€/lez → **16€/mese** *(reale)* | 22€/lez → **11€/mese** *(reale)* |
| mensile | 1 | 32€/lez → **32€/mese** | 22€/lez → **22€/mese** |
| bisettimanale | 2 | 30€/lez → **60€/mese** | 21€/lez → **41€/mese** |
| settimanale | 4 *(vedi nota)* | 28€/lez → **113€/mese** | 19€/lez → **77€/mese** |

**Nota settimanale:** una cadenza settimanale reale è 4,33 lezioni/mese (52/12). `plan_entitlements` oggi supporta solo period `month`/`bimestre` con grant a numero intero. Riga calcolata su **4/mese fisse** (nessun nuovo period-type; nei mesi da 5 settimane il cliente riceve una lezione di cortesia). Alternativa più precisa ma più costosa: nuovo `period='week'`. **Da confermare.**

### Verifica sullo storico (aggiornata)
- 4 all + lezione/bim: 52+16 = **68€/mese** → 136€/bim *(storico reale: 140€/bim → −4€/bim = −2€/mese, dovuto alla nuova formula Asse A)*
- 4 all + call/bim: 52+11 = **63€/mese** → 126€/bim *(storico reale: 130€/bim → stesso −2€/mese)*

### Matrice completa — canone + credito, IN PRESENZA (€/mese)
| n. allenamenti | bimestre | mensile | bisettimanale | settimanale |
|---|---|---|---|---|
| 3 | 60 | 76 | 104 | 157 |
| 4 | 68 | 84 | 112 | 165 |
| 5 | 75 | 91 | 119 | 172 |
| 6 | 81 | 97 | 125 | 178 |
| 7 | 86 | 102 | 130 | 183 |

### Matrice completa — canone + credito, REMOTO/CALL (€/mese)
| n. allenamenti | bimestre | mensile | bisettimanale | settimanale |
|---|---|---|---|---|
| 3 | 55 | 66 | 85 | 121 |
| 4 | 63 | 74 | 93 | 129 |
| 5 | 70 | 81 | 100 | 136 |
| 6 | 76 | 87 | 106 | 142 |
| 7 | 81 | 92 | 111 | 147 |

### Entry price ("a partire da", 1:1 Elite)
- 3 all/sett + call/bim = 44+11 = **55€/mese** *(era 53€)*
- 3 all/sett + lezione/bim = 44+16 = **60€/mese** *(era 58€)*
- Pricing page mostra solo "a partire da 55€/mese" → CTA questionario → prezzo dalla matrice sopra, calcolato prima della sottoscrizione.

### Sconto stagionale — prepagamento
**15%** (sostituisce il 10% precedente), sul totale del pacchetto configurato dal questionario iniziale, se pagato in un'unica soluzione anticipata. A queste fasce di prezzo non interagisce con la soglia bollo (77,47€): un prepagamento pluri-mensile resta comunque sopra soglia con o senza sconto. **Non verificabile da qui**: se il 15% eroda il margine minimo target — solo Alessio ha il dato di costo per validarlo.

### Cadenza di rinnovo Elite
Nessuna domanda separata nel questionario: il rinnovo/incasso segue 1:1 la cadenza di check-in scelta in Asse B (`plan_entitlements.period`) — bimestre paga bimestrale, mensile/bisettimanale/settimanale pagano mensile. Un cliente bimestre che vuole spalmare il pagamento su base mensile per motivi propri di cassa è un'eccezione manuale (stesso pattern del tag sconto coach-assegnato), non un'opzione da onboarding.

### Extra fuori piano
- Base: 35€ lezione singola, 100€ videoanalisi singola
- Tag coach-assegnata per clienti storici (es. Experience 360€/anno): sconto a 25-30€ sulla lezione extra — da formalizzare, non automatico

### Pricing page
- **Open**: 9,90€/mese — rolling 2 settimane di allenamenti pubblicati
- **Open Plus**: 12,90€/mese — archivio completo, nessun limite di tempo
- **1:1 Elite**: "a partire da 55€/mese" → questionario → prezzo dalla matrice, rinnovo = cadenza di check-in scelta

### Architettura
Le due tabelle (`workout_frequency_pricing`, credito check-in) restano righe pre-calcolate — non la formula in sé — ma la formula è la fonte di verità per generarle ed estenderle se cambiano floor/ceiling. Al checkout, somma server-side → importo da segnare come "da incassare" (vedi nota su ADR-014 sotto), non price object precreati per ogni combinazione.

### Decisioni chiuse in questa sessione (30/08/2026)
1. ~~Ancora 32€ credito lezione/bimestre~~ → confermata dalla formula (bimestre = prezzo mensile, nessuno sconto sotto il mensile)
2. Formula Asse A (delta −1€/scaglione) e Asse B (−6%/raddoppio oltre il mensile) — confermate
3. Sconto stagionale 15% — confermato (verifica margine ancora lato Alessio)
4. Prezzi Open (9,90€/mese) e Open Plus (12,90€/mese) — confermati
5. Cadenza di rinnovo Elite = cadenza di check-in scelta, nessuna domanda separata nel questionario — confermato

### Decisioni ancora aperte
1. Settimanale: 4 lezioni/mese fisse o nuovo `period='week'`? (raccomando 4 fisse)
2. Regola "una lezione sostituisce un allenamento scritto" — sì/no
3. Soglie/pacchetti storici che attivano il tag sconto extra-sessione
4. Eccezione manuale rinnovo bimestrale→mensile: gestita come tag coach, non da formalizzare in UI a meno che diventi frequente

---

## 3. Stripe, SEPA, fatturazione — **SUPERATO da ADR-014** (Stripe eliminato, pagamento manuale/bonifico con "mark as paid" dal coach). Sezione lasciata per storico/riferimento, non usare per nuova implementazione.

### La domanda del commercialista
Se ogni incasso Stripe richiede comunque ricevuta/fattura, ha senso l'abbonamento ricorrente gestito da un operatore esterno?

### Fatti verificati (ricerca web, ago 2026)
- Stripe **non è** "un canale SEPA": è un processore multi-metodo. SEPA Direct Debit (addebito su IBAN via mandato) è uno dei metodi disponibili, non il default (che è la carta).
- Costi Italia: carta EEA ~1,5%+0,25€; SEPA DD ~0,8%+0,25-0,30€ — circa metà commissione, ma incasso in ~5 giorni lavorativi e mandato da far firmare al cliente. SEPA DD ha finestra di rimborso "senza motivo" fino a 8 settimane.
- I payout da Stripe al conto italiano viaggiano comunque su SEPA Credit Transfer, indipendentemente dal metodo di incasso scelto.

### Punto chiave
**L'obbligo di documentare l'incasso non dipende dal canale.** Vale uguale per carta, SEPA, bonifico o contante — già scritto in ADR-010: *"ciò che rende un incasso in regola è la ricevuta, non il canale."*

### Decisione finale (ADR-014)
Strada 2 — incasso manuale/bonifico + monitoraggio in-app. Schema `payment_status`/`da_incassare` (ADR-010, `glide-ext-pagamenti.md`) esteso a flusso generico con soglia e alert al coach.

---
*Onda dopo onda.*
