# PROMPT_CODE_ONDA_12 — Palestra (lato atleta) · Runbook per Claude Code

**Fonte:** `LA_07_PALESTRA.md` (onda 12 della numerazione LA, parallela all'onda 11/`LA_08` —
nessuna sovrapposizione di schema: non tocca `gare_*`, `personal_bests_manuali`,
`program_notes`, `program_phases`).

**Le 5 assunzioni di `LA_07_PALESTRA.md` §10 sono state confermate da Alessio** (sessione del
2026-08-19): Epley per il 1RM, nessun gate di approvazione sugli esercizi aggiunti dall'atleta,
finestra di modifica "stesso giorno", al massimo una palestra dichiarata al giorno, numero di
sessioni tipo lasciato libero (oggi 3, non vincolato a schema). Vedi tabella §0.3 sotto per il
dettaglio decisione-per-decisione.

---

## 0. Prima di eseguire — 3 correzioni rispetto alla bozza `LA_07`

`LA_07_PALESTRA.md` è stato scritto assumendo pattern che **non esistono in questo repo**.
Verificato sul codice reale (non sulla documentazione LA_* parallela, che qui non è presente):
nessun `squad_kind`, nessuna colonna gruppo/squadra su `profiles`, nessuna tabella `strength`
per il POST palestra. Le correzioni sotto non sono negoziabili: eseguile PRIMA di scrivere lo
schema.

### 0.1 — Scope `prescrizioni_palestra`: niente `squad`

La bozza propone `scope in ('group','squad','athlete')` con un tipo `squad_kind` "già in uso per
l'acqua". **Non è vero in questo repo**: GLIDE è coach-unico (`is_coach()`, nessun `coach_id` su
`profiles` — vedi `STATO.md` §S-0.5), e nessuna tabella assegna oggi allenamenti per sottogruppo
di atleti. `squad_kind` non esiste da nessuna parte nel codice.

**Decisione (confermata):** scope ridotto a **`group`/`athlete`** soltanto.
- `group` = tutti gli atleti (equivalente a "pubblica per tutti" del Canale Open).
- `athlete` = un singolo atleta (`athlete_id`).

Niente colonna `squad`, niente tipo `squad_kind`. Se in futuro nasce un vero concetto di gruppo/
squadra in GLIDE, si riapre lo schema allora — non qui, non per analogia con un documento che
questo repo non contiene.

### 0.2 — Il "POST palestra" di `LA_02 §2.6` non esiste ancora: va costruito qui

La bozza dice: *"Oggi il sistema cattura solo il POST palestra (RPE differenziato + durata,
seduta marcata `strength`)"*. **Falso per questo repo**: il check-in post-sessione esistente
(`src/app/app/readiness-actions.ts::savePost`, tabella `readiness`) copre SOLO le sedute in
acqua — un `workout_id` che punta a `workouts` (kind `personal`/`open_channel`), RPE 1–10 e
`umore_post`. Non esiste alcuna nozione di seduta `strength`, nessuna durata palestra, nessun
RPE differenziato per la palestra.

**Decisione:** il carico interno palestra (RPE + durata, invariante 4 del brief — mai mediato
con quello acqua) **si costruisce dentro `palestra_giornaliera`**, non dentro `readiness`. È la
riga-gate di cui parla `LA_07` §4 punto 0: quando l'atleta risponde "sì" a *"Hai fatto
palestra oggi?"*, la stessa schermata chiede anche RPE palestra (1–10) e durata (minuti). Non si
tocca `readiness`: resta il dominio esclusivo dell'acqua, coerente con "tonnellaggio non entra
nel carico_seduta_AU" (`LA_07` §6) e con l'invariante di separabilità già applicato altrove
(Onda 12.4 di `STATO.md`, RPE/umore Open vs 1:1).

### 0.3 — Assunzioni `LA_07` §10, esito

| # | Assunzione bozza | Esito |
|---|---|---|
| 1 | Formula 1RM: Epley | **Confermata**, invariata nello schema sotto. |
| 2 | Esercizio atleta: nessun gate di approvazione | **Confermata**, invariata. |
| 3 | Finestra di modifica: stesso giorno, poi bloccato | **Confermata**, invariata. |
| 4 | Al massimo una palestra dichiarata/giorno | **Confermata**, invariata (chiave `atleta_id,giorno`). |
| 5 | N. sessioni tipo: oggi 3, non vincolato a schema | **Confermata**, invariata. |
| — | Scope `group/squad/athlete` (pattern "acqua") | **Ridotto a `group/athlete`** — vedi §0.1. |
| — | POST palestra RPE+durata già esistente | **Non esiste — costruito qui**, dentro `palestra_giornaliera` — vedi §0.2. |

---

## 1. Vincoli per questa sessione

```
NON devi:
- toccare gare_*, personal_bests_manuali, program_notes, program_phases (dominio onda 11/LA_08)
- introdurre un concetto di squadra/gruppo intermedio: solo group (tutti) o athlete (singolo)
- mescolare il carico palestra nel calcolo di carico_seduta_AU (resta RPE acqua × durata acqua)
- rendere pubblico/di sistema il calcolo del 1RM prima della conferma del coach
  (stato 'proposto' finché is_coach() non conferma)
- far scrivere all'atleta righe di esecuzione fuori dalla finestra "stesso giorno"
- creare la migration con `create table if not exists` (ADR-007): dev'essere `create table` puro

DEVI:
- ogni vista: security_invoker = true
- RLS coerente col pattern esistente (atleta insert/select solo su proprie righe;
  coach via is_coach() legge tutto, scrive libreria/sessioni tipo/prescrizioni,
  conferma/respinge i test 1RM)
- palestra_giornaliera immodificabile dopo la scrittura del giorno stesso
  (stesso principio "una risposta corretta a posteriori è un ricordo, non una misura")
- un TEST/verifica per ogni policy RLS nuova, come nelle onde precedenti
- a fine sessione: aggiornare STATO.md e .aios/HANDOFF.md, commit, push
```

---

## 2. Fase A — Schema (`supabase/migrations/migration_035_palestra.sql`)

```sql
-- ============================================================
-- migration_035_palestra.sql — Onda 12 (LA_07): Palestra lato atleta
-- create table PURA (ADR-007): se il nome è preso, fallisce rumorosamente.
-- ============================================================

-- ESERCIZI --------------------------------------------------------------
create type origine_esercizio as enum ('libreria', 'atleta');

create table esercizi (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  gruppo        text,                          -- es. 'gambe','spinta','trazione','core'
  note_tecniche text,
  origine       origine_esercizio not null default 'libreria',
  creato_da     uuid references profiles(id),
  attivo        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- SESSIONI TIPO ------------------------------------------------------------
-- i "3 previsti": template riutilizzabili, non legati a una data. Nessun
-- vincolo di schema sul numero (§0.3 #5): è quante righe attive mantiene il coach.
create table sessioni_palestra_tipo (
  id          uuid primary key default gen_random_uuid(),
  etichetta   text not null,
  attivo      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- DICHIARAZIONE GIORNALIERA + CARICO INTERNO PALESTRA ----------------------
-- il gate, PIÙ il "POST palestra" che LA_02 §2.6 dava per esistente e non
-- esiste (§0.2): RPE differenziato + durata vivono qui, mai in `readiness`.
create table palestra_giornaliera (
  atleta_id         uuid not null references profiles(id),
  giorno            date not null default current_date,
  ha_fatto          boolean not null,
  sessione_tipo_id  uuid references sessioni_palestra_tipo(id),
  rpe_palestra      smallint check (rpe_palestra between 1 and 10),
  durata_min        smallint check (durata_min > 0),
  dichiarato_il     timestamptz not null default now(),
  primary key (atleta_id, giorno),
  check (not ha_fatto or sessione_tipo_id is not null),
  check (not ha_fatto or (rpe_palestra is not null and durata_min is not null)),
  check (ha_fatto or (rpe_palestra is null and durata_min is null))
);

-- PRESCRIZIONE ------------------------------------------------------------
-- scope ridotto a group/athlete (§0.1): niente squad, niente squad_kind.
create table prescrizioni_palestra (
  id                uuid primary key default gen_random_uuid(),
  sessione_tipo_id  uuid not null references sessioni_palestra_tipo(id),
  scope             text not null check (scope in ('group','athlete')),
  athlete_id        uuid references profiles(id), -- valorizzato se scope='athlete'
  esercizio_id      uuid not null references esercizi(id),
  ordine            smallint not null default 0,
  serie             smallint not null,
  rip_min           smallint,
  rip_max           smallint,
  carico_kg         numeric,
  carico_pct_1rm    numeric,
  note              text,
  created_by        uuid not null references profiles(id),
  created_at        timestamptz not null default now(),
  check (scope <> 'athlete' or athlete_id is not null),
  check (scope <> 'group' or athlete_id is null)
);

-- ESEGUITO ------------------------------------------------------------
-- prescrizione_id nullo = esercizio aggiunto ad hoc dall'atleta, fuori programmazione
create table esecuzioni_palestra (
  id               uuid primary key default gen_random_uuid(),
  atleta_id        uuid not null references profiles(id),
  esercizio_id     uuid not null references esercizi(id),
  prescrizione_id  uuid references prescrizioni_palestra(id),
  data             date not null default current_date,
  serie_numero     smallint not null,
  ripetizioni      smallint not null,
  carico_kg        numeric not null,
  created_at       timestamptz not null default now()
);

-- 1RM ------------------------------------------------------------
-- il submassimale propone (Epley, §0.3 #1), il coach conferma.
create table test_1rm_palestra (
  id             uuid primary key default gen_random_uuid(),
  atleta_id      uuid not null references profiles(id),
  esercizio_id   uuid not null references esercizi(id),
  peso_kg        numeric not null,
  ripetizioni    smallint not null,
  rm_stimato_kg  numeric generated always as (peso_kg * (1 + ripetizioni::numeric / 30)) stored,
  stato          text not null default 'proposto' check (stato in ('proposto','confermato','respinto')),
  confermato_da  uuid references profiles(id),
  confermato_il  timestamptz,
  data_test      date not null default current_date,
  created_at     timestamptz not null default now()
);

-- TONNELLAGGIO --------------------------------------------------------
create or replace view v_carico_palestra_atleta
with (security_invoker = true) as
select atleta_id,
       data,
       sum(ripetizioni * carico_kg) as tonnellaggio_kg
from esecuzioni_palestra
group by atleta_id, data;
```

## 3. Fase B — RLS

```sql
alter table esercizi enable row level security;
alter table sessioni_palestra_tipo enable row level security;
alter table palestra_giornaliera enable row level security;
alter table prescrizioni_palestra enable row level security;
alter table esecuzioni_palestra enable row level security;
alter table test_1rm_palestra enable row level security;

-- esercizi: tutti gli autenticati leggono (serve per prescrivere/loggare);
-- l'atleta inserisce solo con origine='atleta' e creato_da=sé; il coach fa tutto.
create policy esercizi_select on esercizi for select to authenticated using (true);
create policy esercizi_insert_atleta on esercizi for insert to authenticated
  with check (origine = 'atleta' and creato_da = (select auth.uid()));
create policy esercizi_coach_all on esercizi for all to authenticated
  using (is_coach()) with check (is_coach());

-- sessioni tipo: lettura per tutti (l'atleta deve poterle scegliere al gate), scrittura coach.
create policy sessioni_tipo_select on sessioni_palestra_tipo for select to authenticated using (true);
create policy sessioni_tipo_coach_all on sessioni_palestra_tipo for all to authenticated
  using (is_coach()) with check (is_coach());

-- palestra_giornaliera: self insert/select, coach legge tutto.
-- NIENTE policy update/delete per l'atleta oltre la finestra "stesso giorno" (§0.3 #3):
-- lo stesso giorno la riga è UPSERT-abile dall'atleta (unica per atleta+giorno),
-- il giorno dopo diventa immodificabile per costruzione (nessuna policy update oltre oggi).
create policy palestra_g_select on palestra_giornaliera for select to authenticated
  using (atleta_id = (select auth.uid()) or is_coach());
create policy palestra_g_insert on palestra_giornaliera for insert to authenticated
  with check (atleta_id = (select auth.uid()) and giorno = current_date);
create policy palestra_g_update_stesso_giorno on palestra_giornaliera for update to authenticated
  using (atleta_id = (select auth.uid()) and giorno = current_date)
  with check (atleta_id = (select auth.uid()) and giorno = current_date);

-- prescrizioni_palestra: l'atleta legge quelle risolte per sé (group o proprio athlete_id),
-- scrive solo il coach.
create policy prescrizioni_select on prescrizioni_palestra for select to authenticated
  using (scope = 'group' or athlete_id = (select auth.uid()) or is_coach());
create policy prescrizioni_coach_all on prescrizioni_palestra for all to authenticated
  using (is_coach()) with check (is_coach());

-- esecuzioni_palestra: self insert/select; update/delete SOLO stesso giorno (§0.3 #3).
create policy esecuzioni_select on esecuzioni_palestra for select to authenticated
  using (atleta_id = (select auth.uid()) or is_coach());
create policy esecuzioni_insert on esecuzioni_palestra for insert to authenticated
  with check (atleta_id = (select auth.uid()) and data = current_date);
create policy esecuzioni_update_stesso_giorno on esecuzioni_palestra for update to authenticated
  using (atleta_id = (select auth.uid()) and data = current_date)
  with check (atleta_id = (select auth.uid()) and data = current_date);
create policy esecuzioni_delete_stesso_giorno on esecuzioni_palestra for delete to authenticated
  using (atleta_id = (select auth.uid()) and data = current_date);

-- test_1rm_palestra: self insert/select (sempre 'proposto' in insert); conferma/respinge solo coach.
create policy test1rm_select on test_1rm_palestra for select to authenticated
  using (atleta_id = (select auth.uid()) or is_coach());
create policy test1rm_insert on test_1rm_palestra for insert to authenticated
  with check (atleta_id = (select auth.uid()) and stato = 'proposto');
create policy test1rm_coach_update on test_1rm_palestra for update to authenticated
  using (is_coach()) with check (is_coach());
```

**TEST OBBLIGATORIO** (come da vincolo globale ADR-008 — la RLS non è la validazione, è
l'ultima linea): con un token atleta, prova
1. `update palestra_giornaliera set ha_fatto=... where giorno < current_date` → DEVE fallire.
2. `insert into prescrizioni_palestra (...)` → DEVE fallire (solo coach scrive).
3. `update test_1rm_palestra set stato='confermato' where atleta_id=auth.uid()` → DEVE fallire.

Mostra gli errori in `STATO.md`. Se una di queste passa, la fase non è chiusa.

## 4. Fase C — Flusso atleta

Segue `LA_07` §4, con l'adattamento §0.2 (RPE+durata dentro `palestra_giornaliera`, non
`readiness`):

0. **Gate + carico interno**, prima/al posto del check-in swim: *"Hai fatto palestra oggi?"* —
   no → `ha_fatto=false`, fine. Sì → *"Quale sessione?"* (scelta tra `sessioni_palestra_tipo`
   attive) + RPE palestra (1–10, stessa UI `Scale` di `checkin.tsx`) + durata (minuti). Upsert
   su `palestra_giornaliera` per `(atleta_id, giorno)`. Se l'atleta ha già dichiarato oggi, non
   si ripresenta (mostra il riepilogo, modificabile fino a mezzanotte).
1. Prescrizione della sessione tipo dichiarata, risolta per sé (`scope='group'` o
   `athlete_id = auth.uid()`).
2. Log dell'eseguito per serie: form precompilato da `serie/rip_min..rip_max/carico_kg` della
   prescrizione, tutti i campi modificabili (decisione #1 di `LA_07` §9, confermata).
3. Esercizio non in libreria → insert in `esercizi` con `origine='atleta'`, `creato_da=sé`,
   subito utilizzabile (decisione #2, confermata — nessun gate).
4. Test submassimale, indipendente dalla sessione: peso+ripetizioni → `rm_stimato_kg` (Epley,
   generata) mostrato come proposta, `stato='proposto'` finché il coach non conferma.

## 5. Fase D — Flusso coach

Segue `LA_07` §5, scope ridotto a `group`/`athlete` (§0.1):
- Mantiene `sessioni_palestra_tipo` (crea/rinomina/disattiva — mai cancella righe con
  prescrizioni collegate).
- Mantiene `esercizi` (base coach + voci `origine='atleta'` da bonificare/accorpare).
- Assegna `prescrizioni_palestra` per `group` (tutti) o `athlete` (un singolo), dentro ciascuna
  sessione tipo.
- Coda `test_1rm_palestra` con `stato='proposto'` in scheda atleta/roster: conferma o respinge.
- Tonnellaggio palestra (`v_carico_palestra_atleta`) separato dal carico acqua, per atleta e
  aggregato — mai un numero unico (invariante di separabilità).

## 6. Collaudo

- Da atleta: dichiara "no" al gate → nessuna schermata esercizi, nessun RPE/durata richiesti.
- Da atleta: dichiara "sì" + sessione → vede la prescrizione risolta per sé, logga 2 esercizi
  (uno di libreria, uno ad-hoc nuovo) → il coach lo vede subito in roster esercizi.
- Da atleta: submassimale → RM stimato mostrato, `proposto`; il coach lo conferma in scheda →
  solo da quel momento è utilizzabile per `carico_pct_1rm` nelle prescrizioni successive.
- Verifica finestra: prova a modificare un'esecuzione di ieri → rifiutato (RLS + UI che non
  offre la modifica fuori data).
- Verifica tonnellaggio: `v_carico_palestra_atleta` per l'atleta di prova mostra il kg totale
  del giorno, separato dal carico acqua in vista coach.
- `npx tsc --noEmit`, `npm run lint`, `next build` verdi (stesso pattern di verifica delle onde
  precedenti — build si ferma solo su env Supabase mancanti nel sandbox).

## 7. A fine sessione

Aggiorna `STATO.md` (nuova sezione Onda 12/LA_07) e `.aios/HANDOFF.md` con: file toccati,
migration da applicare al deploy (`migration_035_palestra.sql` — additiva, RLS nuova, nessun
dato esistente toccato), collaudo eseguito, eventuali blocchi. Poi commit e push.
