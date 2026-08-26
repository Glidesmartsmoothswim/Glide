# GLIDE — Questionario Readiness (spec v3)

> Sostituisce `GLIDE_QUESTIONARIO.md` v2. Cambio rispetto a v2: rimosso il blocco dolore
> strutturato (`pain_sites`, `corpo`, `health_flag`, `red_flag`) — vedi ADR-013.
> Vincoli: `GLIDE_ADR.md` → ADR-004 (confine sanitario, **invariato**: il matcher chat-based
> L1/L2 resta attivo, questo documento non lo tocca).

---

## 0. Cosa cambia rispetto a v2

Il questionario readiness non chiede più dove e quanto fa male. Non perché il dolore non conti
per un coach — conta, e resta un tema legittimo — ma perché un campo strutturato dedicato al
dolore è dato sanitario ai sensi del GDPR a prescindere da come viene usato (ADR-013).

Il canale per segnalare dolore/sintomi resta aperto: **chat con il coach, o la nota libera qui
sotto.** Lì, il matcher ADR-004 (L1 muscoloscheletrico, L2 red flag) continua a funzionare
esattamente come prima — è un sistema separato, non tocca il readiness.

---

## ADR-006 — Regole delle scale (vincolanti, invariate da v2)

1. **5 è sempre meglio. Nessuna domanda invertita, mai.**
2. **Le ancore sono visibili mentre si tappa.**
3. **Fisico e mentale non si mediano mai insieme.** Due indici separati (§3).
4. **Il nuotatore non vede mai il proprio indice di readiness.**
5. **L'RPE (1–10) non entra mai in nessuna media con le scale 1–5.**

---

## 1. Check-in PRIMA — 4 domande, 20 secondi

### 1.1 Blocco FISICO

**Come hai dormito?**
| | |
|---|---|
| 1 | Non ho chiuso occhio |
| 2 | Male, poche ore |
| 3 | Così così |
| 4 | Bene |
| 5 | Come un sasso |

**Quanta energia hai?**
| | |
|---|---|
| 1 | Sono a terra |
| 2 | Poca |
| 3 | Normale |
| 4 | Bella carica |
| 5 | Pieno serbatoio |

> **Rimosso da v2:** "Come sta il corpo?" (scala dolore) e il chip "Dove?" (sede del dolore,
> incluso il sotto-chip ⚠️ Petto/respiro/testa). Vedi ADR-013. Se un nuotatore ha dolore o
> sintomi da segnalare, lo scrive nella nota libera (§2) o in chat — canale invariato, matcher
> ADR-004 attivo come sempre.

### 1.2 Blocco MENTALE

**Come stai, fuori dall'acqua?**
| | Standard | Franco *(variante configurabile)* |
|---|---|---|
| 1 | Giornataccia | Sto di merda |
| 2 | Non benissimo | Umore sotto i piedi |
| 3 | Normale | Nella media |
| 4 | Bene | Bene |
| 5 | Alla grande | Sono felice |

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

**Quanto è stata dura?** — RPE 1–10, ancorata (Borg CR10 adattata) — invariato da v2.

**E adesso, come stai?** — 1–5, stessa scala dell'umore pre — invariato.

**Una nota per Alessio** — testo libero, opzionale. **Canale primario per segnalare dolore o
sintomi**, ora che il chip strutturato non c'è più. Il matcher ADR-004 gira su questo testo
prima che arrivi a qualunque LLM, esattamente come sulla chat. Il contenuto della nota non
entra mai in `events` (ADR-004): nel ledger va solo `has_note: true`.

---

## 3. I due indici — mai uno solo

```js
// invariato nella logica, cambiato nella composizione: corpo non c'è più
readiness_fisica  = (sonno + energia) / 2          // 1–5, era /3 con corpo
readiness_mentale = (umore + motivazione) / 2       // 1–5, invariato
```

**Non esiste un `readiness_totale`. Non va creato.**

---

## 4. L'Effetto Acqua

Invariato da v2 — `effetto_acqua = umore_post - umore_pre`, non dipende dai campi rimossi.

---

## 5. Il filtro della Curva di Efficienza

Invariato nella logica; la soglia resta `readiness_fisica ≥ 3.5`, ma ora quell'indice misura
solo sonno+energia, non più corpo. **Da verificare con l'uso reale se la soglia va ricalibrata**
— non è un problema da risolvere ora, è una nota per quando ci sono dati sufficienti.

```
Un dato entra nella curva SOLO SE:
  readiness_fisica ≥ 3.5
  stessa fascia di zona
  stesso passo prescritto (o ±2%)

Si mostra la curva SOLO SE:
  ≥ 6 punti validi nella finestra di 8 settimane
```

---

## 6. Note di implementazione

- **Salvare i valori grezzi.** Gli indici si calcolano in lettura, con `algo_version`.
- **Nessun campo saltabile** tra i 4 core (sonno, energia, umore, motivazione).
- **Il check-in pre scade.** Compilato più di 3 ore prima della seduta = non filtra la curva.
- **Un solo check-in pre per seduta.**
- **Rimosso da v2:** `pain_sites`, `corpo`, `health_flag`, `red_flag` non esistono più a schema.
  Vedi `migration_041_readiness_remove_pain_fields.sql` e ADR-013.
