# GLIDE — Intake alla prima registrazione (spec v0.1)

> **Stato:** documento di lavoro, non vincolante.
> **Vincoli ereditati:** ADR-004 (nessuna domanda medica nell'intake — la salute passa dal router di sicurezza), ADR-006 (5 = sempre meglio, ancore visibili), GLIDE_VOICE.md (copy), GLIDE_TIPOGRAFIA.md.
> **Posizione nel flusso:** dopo signup + onboarding 6 schermate (il patto resta non skippabile), prima della home. Compilazione una sola volta; tutti i campi restano modificabili dalla scheda personale.

---

## 1. Step 0 — Chi sei

Prima domanda, due card grandi:

| Scelta | Valore | Effetto |
|---|---|---|
| **Nuoto (anche) in gara** | `athlete_type = 'agonista'` | percorso A |
| **Nuoto per me** | `athlete_type = 'libero'` | percorso B |

Copy non giudicante: "libero" non è "principiante". Cambiabile in seguito dal profilo (con conferma del coach, perché cambia il motore di valutazione).

## 2. Blocco comune (entrambi i percorsi)

- Anno di nascita (già richiesto dal Lab per la fascia correttivi)
- Vasca abituale: 25 / 50 m
- Frequenza settimanale prevista: 1 / 2 / 3 / 4+
- **Obiettivo principale** — chip singolo:
  `Tecnica · Resistenza · Velocità · Rimettermi in forma · Prepararmi a una gara · Benessere/costanza`
  → `intake.goal_primary` + campo libero breve opzionale "In una frase, cosa cerchi da GLIDE?"

Nessuna domanda medica. Nessuna domanda su peso/dieta.

## 3. Percorso A — Agonista

Riusa i campi già definiti in glide-ext-lab §3 (nessun campo nuovo inventato):

- Anni di nuoto: `<2 / 2–5 / 5+`
- Continuità: `costante / intermittente / ripresa`
- Gare negli ultimi 12 mesi: sì/no
- Esperienza con lavori a intensità: sì/no
- Device FC: sì/no

**Terna tempi (opzionale in registrazione):**
- 100 / 200 / 400 stesso stile e stessa vasca, data della prova
- Validazioni identiche a glide-test-master §2 (monotonia, plausibilità, recenza ≤ 8 settimane)
- Se completa e valida → alimenta il motore CSS/D′ come un test Lab (stesso `cssEngine.ts`, `source = 'intake'`)
- Se parziale o assente → messaggio: "Li aggiungi quando vuoi dalla tua scheda." Nessun blocco.
- Aggiornabile in ogni momento da **Scheda → I miei tempi** (storico, non sovrascrittura: ogni terna è una riga nuova, la più recente valida è quella attiva)

## 4. Percorso B — Non agonista (libero)

Niente terna, niente CSS, niente Z5. Quattro domande:

1. **Hai mai fatto corsi di nuoto?** `Mai / Da bambino · ragazzo / Da adulto / Nuoto da sempre`
2. **Quali stili sai nuotare?** chip multi-select: `Stile libero · Dorso · Rana · Delfino` (+ "nessuno con sicurezza")
3. **Come ti giudichi in acqua?** scala 1–5 con ancore visibili (ADR-006, 5 = meglio):
   1 Faccio fatica a finire una vasca · 2 Nuoto ma mi stanco presto · 3 Me la cavo · 4 Nuoto bene · 5 Mi sento a casa
4. **Dove vorresti migliorare?** chip multi: `Respirazione · Tecnica di uno stile · Resistenza · Sicurezza in acqua · Dimagrire nuotando · Imparare uno stile nuovo`

### Motore di livello (deterministico, no AI)

`level = f(corsi, stili, autovalutazione)` → `Base / Intermedio / Avanzato`
- Il livello è visibile al coach, **non mostrato come punteggio al nuotatore** (stesso principio ADR-006 §4: ciò che si vede si ottimizza).
- Intensità espresse in **RPE e sensazioni**, mai in passo/100: la scala Z resta interna al coach.
- Glide Score e 6 profili: **non applicabili** al percorso B in v1. Effetto Acqua e curva pace@RPE sì — funzionano senza cronometro, ed erano nati per questo.
- Passaggio B→A: se il nuotatore inserisce una terna valida, il gestionale propone al coach la conversione. Mai automatica.

## 5. Dati

```sql
alter table public.profiles add column if not exists athlete_type text
  not null default 'agonista' check (athlete_type in ('agonista','libero'));

create table if not exists public.intake (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) unique,
  goal_primary text not null,
  goal_note text,
  freq_settimanale text not null,
  vasca int not null check (vasca in (25,50)),
  -- percorso A
  anni_nuoto text, continuita text, gare_12m boolean,
  esperienza_intensita boolean, device_fc boolean,
  -- percorso B
  corsi text, stili text[], autovalutazione int check (autovalutazione between 1 and 5),
  aree_miglioramento text[],
  created_at timestamptz not null default now()
);
-- RLS: select/insert/update solo self; coach select sui propri nuotatori.
```

Terna tempi: tabella `swim_times` (user_id, t100, t200, t400, stile, vasca, data_prova, source) — storicizzata, RLS come sopra. **Migration tracciata, non SQL Editor.**

## 6. Impatti sul gestionale

- Scheda nuotatore: badge `Agonista / Libero`, livello (solo B), terna attiva + storico (solo A)
- Digest coach: i non agonisti entrano con le stesse regole readiness; il segnale "fisica ≥ 3.5 + sedute saltate = motivazione" vale identico
- Canale Open: filtro/etichetta per athlete_type nella pubblicazione (deciderai se il workout Open ha varianti per livello — fuori scope qui)

## 7. Collaudo minimo

- [ ] Intake compilabile in < 90 secondi su mobile
- [ ] Nessuna scala invertita, ancore sempre visibili
- [ ] Terna parziale → nessun blocco, nessun calcolo
- [ ] Terna valida da intake → stesso output del Lab (stesso engine, stessi flag)
- [ ] Utente B non vede mai Z-pace, CSS, livello numerico
- [ ] Campi modificabili dalla scheda dopo la registrazione
