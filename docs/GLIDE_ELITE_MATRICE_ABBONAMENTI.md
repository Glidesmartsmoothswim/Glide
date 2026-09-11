# GLIDE — Matrice abbonamenti 1:1 Elite (tutte le combinazioni)

> **Documento generato**, non editare a mano: `npx tsx scripts/gen-elite-matrix.ts`.
> Fonte di verità dei prezzi: `src/lib/payment/elite-pricing.ts` (+ `src/lib/payment/pricing.ts`
> per la stagione). Riferimento di prodotto: `GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md` (v5, 30/08/2026).
>
> ⚠️ Tutte le cifre sono **prezzi di lancio, primo anno** — non un impegno permanente.

## Come si compone il prezzo

Due assi indipendenti, sommati per ottenere il **mensile-equivalente**:

- **Asse A — canone allenamenti/settimana** (programmazione scritta), floor a 2.
- **Asse B — credito check-in**, per cadenza × canale (in presenza / remoto).

Il **periodo di fatturazione non è una scelta a parte**: segue 1:1 la cadenza di check-in
(bimestre → incasso bimestrale a importo doppio; mensile/bisettimanale/settimanale → incasso mensile).
La **videoanalisi** (100 €) resta un prodotto standalone e non entra in questa matrice.

Combinazioni possibili: **48** = 6 frequenze × 4 cadenze × 2 canali.
Entry price ("a partire da"): **46 €/mese** (2 allenamenti/sett + call/bimestre).

### Asse A — canone/mese

| allenamenti/sett | canone/mese |
|---|---|
| 2 | 35 € |
| 3 | 44 € |
| 4 | 52 € |
| 5 | 59 € |
| 6 | 65 € |
| 7 | 70 € |

### Asse B — credito check-in (€/mese-equivalente)

| cadenza | In presenza (vasca) | Remoto (call) |
|---|---|---|
| bimestre — 1 volta ogni 2 mesi | 16 € | 11 € |
| mensile — 1 volta al mese | 32 € | 22 € |
| bisettimanale — 2 volte al mese | 60 € | 41 € |
| settimanale — 1 volta a settimana | 113 € | 77 € |

## Matrice sintetica — mensile-equivalente

**In presenza (vasca)**

| allenamenti/sett | bimestre | mensile | bisettimanale | settimanale |
|---|---|---|---|---|
| 2 | 51 € | 67 € | 95 € | 148 € |
| 3 | 60 € | 76 € | 104 € | 157 € |
| 4 | 68 € | 84 € | 112 € | 165 € |
| 5 | 75 € | 91 € | 119 € | 172 € |
| 6 | 81 € | 97 € | 125 € | 178 € |
| 7 | 86 € | 102 € | 130 € | 183 € |

**Remoto (call)**

| allenamenti/sett | bimestre | mensile | bisettimanale | settimanale |
|---|---|---|---|---|
| 2 | 46 € | 57 € | 76 € | 112 € |
| 3 | 55 € | 66 € | 85 € | 121 € |
| 4 | 63 € | 74 € | 93 € | 129 € |
| 5 | 70 € | 81 € | 100 € | 136 € |
| 6 | 76 € | 87 € | 106 € | 142 € |
| 7 | 81 € | 92 € | 111 € | 147 € |

## Matrice completa — 48 combinazioni

- **mensile-eq.** = canone (A) + credito check-in (B).
- **addebito** = importo effettivamente incassato a ogni rinnovo (bimestrale = mensile × 2).
- **stagione** = prepagamento dell'intera stagione per chi si iscrive a settembre
  (10 mesi, −15%); per gli altri mesi di iscrizione vedi la tabella sotto e il CSV stagione.

| # | all./sett | cadenza check-in | canale | canone A | credito B | mensile-eq. | fatturazione | addebito | stagione (Sett, 10 mesi −15%) |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 2 | bimestre | presenza | 35 € | 16 € | **51 €** | bimestrale | 102 € | 433,50 € |
| 2 | 2 | bimestre | remoto | 35 € | 11 € | **46 €** | bimestrale | 92 € | 391 € |
| 3 | 2 | mensile | presenza | 35 € | 32 € | **67 €** | mensile | 67 € | 569,50 € |
| 4 | 2 | mensile | remoto | 35 € | 22 € | **57 €** | mensile | 57 € | 484,50 € |
| 5 | 2 | bisettimanale | presenza | 35 € | 60 € | **95 €** | mensile | 95 € | 807,50 € |
| 6 | 2 | bisettimanale | remoto | 35 € | 41 € | **76 €** | mensile | 76 € | 646 € |
| 7 | 2 | settimanale | presenza | 35 € | 113 € | **148 €** | mensile | 148 € | 1258 € |
| 8 | 2 | settimanale | remoto | 35 € | 77 € | **112 €** | mensile | 112 € | 952 € |
| 9 | 3 | bimestre | presenza | 44 € | 16 € | **60 €** | bimestrale | 120 € | 510 € |
| 10 | 3 | bimestre | remoto | 44 € | 11 € | **55 €** | bimestrale | 110 € | 467,50 € |
| 11 | 3 | mensile | presenza | 44 € | 32 € | **76 €** | mensile | 76 € | 646 € |
| 12 | 3 | mensile | remoto | 44 € | 22 € | **66 €** | mensile | 66 € | 561 € |
| 13 | 3 | bisettimanale | presenza | 44 € | 60 € | **104 €** | mensile | 104 € | 884 € |
| 14 | 3 | bisettimanale | remoto | 44 € | 41 € | **85 €** | mensile | 85 € | 722,50 € |
| 15 | 3 | settimanale | presenza | 44 € | 113 € | **157 €** | mensile | 157 € | 1334,50 € |
| 16 | 3 | settimanale | remoto | 44 € | 77 € | **121 €** | mensile | 121 € | 1028,50 € |
| 17 | 4 | bimestre | presenza | 52 € | 16 € | **68 €** | bimestrale | 136 € | 578 € |
| 18 | 4 | bimestre | remoto | 52 € | 11 € | **63 €** | bimestrale | 126 € | 535,50 € |
| 19 | 4 | mensile | presenza | 52 € | 32 € | **84 €** | mensile | 84 € | 714 € |
| 20 | 4 | mensile | remoto | 52 € | 22 € | **74 €** | mensile | 74 € | 629 € |
| 21 | 4 | bisettimanale | presenza | 52 € | 60 € | **112 €** | mensile | 112 € | 952 € |
| 22 | 4 | bisettimanale | remoto | 52 € | 41 € | **93 €** | mensile | 93 € | 790,50 € |
| 23 | 4 | settimanale | presenza | 52 € | 113 € | **165 €** | mensile | 165 € | 1402,50 € |
| 24 | 4 | settimanale | remoto | 52 € | 77 € | **129 €** | mensile | 129 € | 1096,50 € |
| 25 | 5 | bimestre | presenza | 59 € | 16 € | **75 €** | bimestrale | 150 € | 637,50 € |
| 26 | 5 | bimestre | remoto | 59 € | 11 € | **70 €** | bimestrale | 140 € | 595 € |
| 27 | 5 | mensile | presenza | 59 € | 32 € | **91 €** | mensile | 91 € | 773,50 € |
| 28 | 5 | mensile | remoto | 59 € | 22 € | **81 €** | mensile | 81 € | 688,50 € |
| 29 | 5 | bisettimanale | presenza | 59 € | 60 € | **119 €** | mensile | 119 € | 1011,50 € |
| 30 | 5 | bisettimanale | remoto | 59 € | 41 € | **100 €** | mensile | 100 € | 850 € |
| 31 | 5 | settimanale | presenza | 59 € | 113 € | **172 €** | mensile | 172 € | 1462 € |
| 32 | 5 | settimanale | remoto | 59 € | 77 € | **136 €** | mensile | 136 € | 1156 € |
| 33 | 6 | bimestre | presenza | 65 € | 16 € | **81 €** | bimestrale | 162 € | 688,50 € |
| 34 | 6 | bimestre | remoto | 65 € | 11 € | **76 €** | bimestrale | 152 € | 646 € |
| 35 | 6 | mensile | presenza | 65 € | 32 € | **97 €** | mensile | 97 € | 824,50 € |
| 36 | 6 | mensile | remoto | 65 € | 22 € | **87 €** | mensile | 87 € | 739,50 € |
| 37 | 6 | bisettimanale | presenza | 65 € | 60 € | **125 €** | mensile | 125 € | 1062,50 € |
| 38 | 6 | bisettimanale | remoto | 65 € | 41 € | **106 €** | mensile | 106 € | 901 € |
| 39 | 6 | settimanale | presenza | 65 € | 113 € | **178 €** | mensile | 178 € | 1513 € |
| 40 | 6 | settimanale | remoto | 65 € | 77 € | **142 €** | mensile | 142 € | 1207 € |
| 41 | 7 | bimestre | presenza | 70 € | 16 € | **86 €** | bimestrale | 172 € | 731 € |
| 42 | 7 | bimestre | remoto | 70 € | 11 € | **81 €** | bimestrale | 162 € | 688,50 € |
| 43 | 7 | mensile | presenza | 70 € | 32 € | **102 €** | mensile | 102 € | 867 € |
| 44 | 7 | mensile | remoto | 70 € | 22 € | **92 €** | mensile | 92 € | 782 € |
| 45 | 7 | bisettimanale | presenza | 70 € | 60 € | **130 €** | mensile | 130 € | 1105 € |
| 46 | 7 | bisettimanale | remoto | 70 € | 41 € | **111 €** | mensile | 111 € | 943,50 € |
| 47 | 7 | settimanale | presenza | 70 € | 113 € | **183 €** | mensile | 183 € | 1555,50 € |
| 48 | 7 | settimanale | remoto | 70 € | 77 € | **147 €** | mensile | 147 € | 1249,50 € |

## Stagione prepagata — mesi e sconto per mese di iscrizione

Mesi e sconto **non sono fissi**: derivano da `seasonEnrollment`. Luglio/agosto sono
iscrizione anticipata (10 mesi pieni, −15%); da settembre si pagano solo i mesi restanti
fino a fine giugno, con sconto 15% (Sett–Dic) o 10% (Gen–Giu).

Totale stagione = **mensile-eq. × mesi × (1 − sconto)**.

| mese di iscrizione | mesi pagati | sconto | tipo iscrizione |
|---|---|---|---|
| Gennaio | 6 | 10% | stagione già iniziata |
| Febbraio | 5 | 10% | stagione già iniziata |
| Marzo | 4 | 10% | stagione già iniziata |
| Aprile | 3 | 10% | stagione già iniziata |
| Maggio | 2 | 10% | stagione già iniziata |
| Giugno | 1 | 10% | stagione già iniziata |
| Luglio | 10 | 15% | iscrizione anticipata (pre-stagione) |
| Agosto | 10 | 15% | iscrizione anticipata (pre-stagione) |
| Settembre | 10 | 15% | stagione già iniziata |
| Ottobre | 9 | 15% | stagione già iniziata |
| Novembre | 8 | 15% | stagione già iniziata |
| Dicembre | 7 | 15% | stagione già iniziata |

## File collegati

- `docs/glide-elite-matrice-mensile.csv` — 48 combinazioni (canone, credito, mensile, addebito).
- `docs/glide-elite-matrice-stagione.csv` — 48 × 12 mesi di iscrizione (mesi, sconto, totale stagione).
