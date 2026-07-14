# GLIDE — Questionario Readiness (spec v2)

> Sostituisce il questionario del prototipo.
> Vincoli: `GLIDE_ADR.md` → ADR-004 (confine sanitario), ADR-006 (sotto).

---

## 0. Il bug che questa spec risolve

Nel prototipo:

```js
readinessIndex = (sleep + (6 - fatigue) + (6 - soreness) + mood + motivation) / 5
```

Il codice **inverte** fatica e dolori — assume `5 = molto stanco`. L'interfaccia però mostra solo
la parola *"Fatica"* e i numeri 1–5. Nessuna ancora.

Metà dei nuotatori risponderà *"5 = sono a pezzi"*. L'altra metà *"5 = sto benissimo"*.
Il codice li tratta identici e restituisce un indice **plausibile e sbagliato**. Il peggior tipo
di dato: non manca, mente.

---

## ADR-006 — Regole delle scale (vincolanti)

1. **5 è sempre meglio. Nessuna domanda invertita, mai.**
   Se nel codice compare un `6 - x`, la domanda è formulata male. Si riformula la domanda,
   non si aggiusta la formula.

2. **Le ancore sono visibili mentre si tappa.** Non in un tooltip, non in una guida.
   Estremi sempre a schermo; etichetta del valore selezionato sotto la scala.

3. **Fisico e mentale non si mediano mai insieme.** Due indici separati. (§3)

4. **Il nuotatore non vede mai il proprio indice di readiness.**
   Se lo vede, lo ottimizza. E un questionario ottimizzato è un questionario morto.
   L'indice è supporto alla decisione del coach, non un punteggio per l'atleta.

5. **L'RPE (1–10) non entra mai in nessuna media con le scale 1–5.**
   È una scala di intensità, non di benessere. Direzione opposta per natura.

---

## 1. Check-in PRIMA — 5 domande, 30 secondi

### 1.1 Blocco FISICO

**Come hai dormito?**
| | |
|---|---|
| 1 | Non ho chiuso occhio |
| 2 | Male, poche ore |
| 3 | Così così |
| 4 | Bene |
| 5 | Come un sasso |

**Quanta energia hai?** *(ex "Fatica" — invertita)*
| | |
|---|---|
| 1 | Sono a terra |
| 2 | Poca |
| 3 | Normale |
| 4 | Bella carica |
| 5 | Pieno serbatoio |

**Come sta il corpo?** *(ex "Dolori" — invertita)*
| | |
|---|---|
| 1 | Dolore forte |
| 2 | Fa male |
| 3 | Qualche fastidio |
| 4 | Un po' rigido |
| 5 | Zero dolori |

### 1.2 Se "Corpo" ≤ 3 → **Dove?** (obbligatorio)

Chip a scelta multipla. Senza la sede, "dolore 2" è un dato inutile: non puoi vedere il
**dolore ricorrente nella stessa zona**, che è il segnale numero uno del digest.

```
Spalla dx · Spalla sx · Schiena · Collo · Ginocchio · Anca · Gomito · Altro
```

+ chip separato, sempre in fondo, visivamente distinto:

```
⚠︎  Petto / respiro / testa
```

→ Se selezionato: **template fisso ADR-004 L2, LLM bypassato, notifica immediata al coach.**
Il matcher è un chip, non un modello. Deterministico.

### 1.3 Blocco MENTALE

**Come stai, fuori dall'acqua?**
| | Standard | Franco *(variante configurabile)* |
|---|---|---|
| 1 | Giornataccia | Sto di merda |
| 2 | Non benissimo | Umore sotto i piedi |
| 3 | Normale | Nella media |
| 4 | Bene | Bene |
| 5 | Alla grande | Sono felice |

> Le due varianti stanno in un file di copy, non nel codice. La seconda è più onesta e fa rispondere
> più onestamente — è il tuo registro, "tu", diretto. Decidi tu quale accendere. La cosa importante
> è che **l'estremo 1 sia inequivocabile.**

**Quanta voglia hai di entrare in acqua oggi?**
| | |
|---|---|
| 1 | Zero. Non vorrei essere qui |
| 2 | Poca |
| 3 | Normale |
| 4 | Tanta |
| 5 | Non vedo l'ora |

---

## 2. Check-in DOPO

**Quanto è stata dura?** — RPE 1–10, ancorata (Borg CR10 adattata)

| | |
|---|---|
| 1 | Passeggiata |
| 3 | Facile, potevo andare avanti a lungo |
| 5 | Impegnativa ma sotto controllo |
| 7 | Dura. Parlare era difficile |
| 9 | Al limite |
| 10 | Massimo. Non avevo altro da dare |

*(gli intermedi 2·4·6·8 restano tappabili, senza etichetta)*

---

**E adesso, come stai?** — 1–5, **stessa identica scala dell'umore pre**

> Questa è la domanda che nessuna app di nuoto fa.
> È l'input dell'**Effetto Acqua** (§4). Un tap.

---

**Una nota per Alessio** — testo libero, opzionale.

> Il contenuto della nota **non entra mai in `events`** (ADR-004). Nel ledger va solo `has_note: true`.

---

## 3. I due indici — mai uno solo

```js
// 5 è sempre meglio. Nessuna inversione. Nessun 6 - x.
readiness_fisica  = (sonno + energia + corpo) / 3          // 1–5
readiness_mentale = (umore + motivazione) / 2              // 1–5
```

**Non esiste un `readiness_totale`. Non va creato.**

| Scenario | Fisica | Mentale | Cosa significa | Cosa fai |
|---|---|---|---|---|
| Settimana d'inferno al lavoro | 4.3 | 1.5 | La vita fuori pesa. **Il corpo regge.** | **Non toccare il carico.** È venuto qui apposta |
| Influenza, spalla dolorante | 1.7 | 4.5 | Vuole nuotare ma **il corpo no** | Alleggerisci |
| Sta bene | 4.5 | 4.5 | — | Procedi |
| Rosso su entrambi | 1.8 | 2.0 | Segnale serio | Chiamalo |

**Con un numero solo, il caso 1 e il caso 2 danno lo stesso identico valore (~3).**
E richiedono decisioni opposte. Ecco perché la media unica va eliminata.

---

## 4. L'Effetto Acqua

```js
effetto_acqua = umore_post - umore_pre        // -4 … +4
```

Aggregato sullo storico:

> **"Sei entrato in acqua 87 volte. 79 volte sei uscito meglio di come sei entrato."**

Non è un badge. È la **prova numerica** che questa cosa gli sta migliorando la vita.
Un Master non rinnova perché va più veloce. Rinnova perché **funziona** — e per la prima volta
glielo puoi dimostrare con un numero.

Mostrare solo dopo **≥ 20 sessioni**. Sotto quella soglia è rumore.

---

## 5. Il filtro della Curva di Efficienza

La curva `pace @ RPE` confronta l'RPE a parità di passo prescritto. Ma l'RPE **non misura solo la
forma**: chi dorme quattro ore e ha il figlio malato riporta RPE più alto a parità di allenamento.

Senza filtro, la curva direbbe *"stai regredendo"* all'uomo che aveva più bisogno del contrario.

**Non correggiamo l'RPE con un modello inventato. Filtriamo.**

```
Un dato entra nella curva SOLO SE:
  readiness_fisica ≥ 3.5     ← comparabilità fisica
  stessa fascia di zona
  stesso passo prescritto (o ±2%)

Si mostra la curva SOLO SE:
  ≥ 6 punti validi nella finestra di 8 settimane
Altrimenti: non si mostra niente.
```

Meno dati, ma **veri**. Un trend rumoroso spacciato per progresso è peggio di nessun trend.

> Nota: la readiness **mentale** non filtra la curva. Un uomo giù di morale che nuota bene
> ha nuotato bene. Il dato vale.

---

## 6. Note di implementazione

- **Salvare i valori grezzi.** Gli indici si calcolano in lettura, con `algo_version`.
  Le formule cambieranno; i dati grezzi no.
- **Nessun campo saltabile** tra i 5 core. Nessun "N/A", nessun "preferisco non rispondere".
- **Il check-in pre scade.** Compilato più di 3 ore prima della seduta = non filtra la curva.
- **Un solo check-in pre per seduta.** Niente ritentativi: il secondo tentativo è già ottimizzazione.
- `health_flag: true` in `events` quando Corpo ≤ 3. **Mai la sede, mai il testo.**
