# Handoff — Gestionale GLIDE · 19 agosto 2026

## Sessione appena chiusa — Planning `PROMPT_CODE_ONDA_12.md` (Palestra lato atleta)
Richiesta: leggere stato/handoff e procedere con `LA_07_PALESTRA.md` (documento esterno caricato
in sessione, non presente nel repo) — modello dati palestra: prescrizione per esercizio,
log dell'eseguito, storico 1RM da test submassimale confermato dal coach.

- Il documento condizionava la scrittura del runbook alla conferma di **5 assunzioni** (§10):
  confermate da Alessio via domande dirette in sessione — Epley per il 1RM, nessun gate di
  approvazione sugli esercizi aggiunti dall'atleta, finestra di modifica "stesso giorno", una
  palestra dichiarata al giorno, numero di sessioni tipo lasciato libero (oggi 3, non vincolato
  a schema).
- **Verificati e corretti 2 disallineamenti reali tra bozza e codice**, anch'essi confermati con
  Alessio:
  1. Scope `prescrizioni_palestra` — la bozza assumeva `group/squad/athlete` con un tipo
     `squad_kind` "già in uso per l'acqua": **non esiste in questo repo** (GLIDE è coach-unico,
     nessun concetto di squadra). Ridotto a **`group`/`athlete`**.
  2. "POST palestra" (RPE differenziato + durata) — la bozza lo dava per già esistente
     (`LA_02 §2.6`): **non esiste**, il check-in reale (`readiness-actions.ts`) copre solo
     l'acqua. Costruito nel runbook **dentro `palestra_giornaliera`** (nuove colonne
     `rpe_palestra`/`durata_min`), mai mescolato con `readiness`.
- **Deliverable di questa sessione: `PROMPT_CODE_ONDA_12.md`** (root) — runbook completo:
  schema (`migration_035_palestra.sql`), RLS + test obbligatori, flusso atleta, flusso coach,
  collaudo. **Nessun codice applicativo scritto**: solo planning, coerente col cancello posto
  dalla bozza stessa ("se questi punti sono ok, scrivo il runbook").

### File toccati
- `PROMPT_CODE_ONDA_12.md` (nuovo, root).
- `STATO.md` (nuova sezione "PLANNING — PROMPT_CODE_ONDA_12.md").
- `.aios/HANDOFF.md` (questo file).

### Verifica fatta in sessione
- Letto l'intero repo per verificare i pattern citati dalla bozza come "già in uso" (scope
  gruppo/squadra, POST palestra): **entrambi assenti**, corretti nel runbook prima di scriverlo
  invece di lasciarli come contraddizione silenziosa.
- Nessuna migration applicata, nessun codice UI/server scritto: questa sessione è solo il
  passaggio da bozza esterna a runbook eseguibile.

## Prossimo passo
- **Eseguire `PROMPT_CODE_ONDA_12.md`** in una prossima sessione Claude Code: applica
  `migration_035_palestra.sql`, RLS + test, poi flusso atleta e coach.
- Resta aperto tutto il binario privacy/GDPR (DPIA, testi consenso) — non toccato qui.
- Onda 11/`LA_08_TEST_GARE_PB_MAPPA.md` (gare/PB) procede in parallelo, dominio separato — non
  toccata qui.

## Blocchi
- Nessun blocco tecnico. Il runbook è pronto per l'esecuzione.
- Restano i blocchi già noti: `004_consents` su DPIA/consensi (legale); gate umani elencati nelle
  onde precedenti (MFA coach, leaked-password, backup PITR, env Upstash, CSP enforcing, gitleaks).

## Note di sessione
- `LA_07_PALESTRA.md` è stato fornito come allegato di sessione, non fa parte del repo. La serie
  `LA_00`…`LA_08` a cui fa riferimento (in particolare `LA_02_QUESTIONARI.md` e
  `LA_06`, citati per pattern "già in uso") non è disponibile in questo repo: dove la bozza
  assumeva quei pattern come esistenti, ho verificato sul codice reale ed è risultato falso in
  2 punti — corretti esplicitamente nel runbook (§0 di `PROMPT_CODE_ONDA_12.md`) invece di
  copiarli ciecamente.
