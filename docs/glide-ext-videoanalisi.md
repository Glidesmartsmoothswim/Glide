# GLIDE — Estensione EVENTO VIDEOANALISI (Sprint S7)
> Addendum a `glide-ext-booking.md`. Stesse regole d'ingaggio (modalità autonoma, brand token, RLS, Europe/Rome).
> Dipende da: `events`, `event_signups`, `bookings` (S6).

---

## 0. Il concetto in una riga

Un evento videoanalisi **non è una prenotazione**: è un **contenitore con una scaletta interna**.
Il nuotatore sceglie *cosa* fare (griglia test), non *quando*. **L'orario lo decide il coach**, dopo, generando la scaletta.

```
COACH crea evento  →  NUOTATORE si iscrive e sceglie i test  →  COACH genera la scaletta  →  COACH pubblica
   (in anticipo)         (durata stimata calcolata)            (riscaldamento/ingresso/uscita)   (ognuno vede il SUO orario)
```

Questo è il punto critico: **niente prenotazione di orario lato cliente**. Se 18 persone scegliessero l'ora, la mezza giornata salterebbe. Il cliente prenota il *posto* e i *test*; il coach ordina.

---

## 1. Migration — `supabase/migrations/<ts>_videoanalisi.sql`

```sql
-- 1.1 Estensione della tabella events (già esistente da S6)
alter table public.events
  add column format text not null default 'simple'
    check (format in ('simple','videoanalisi')),
  add column window_start   timestamptz,      -- inizio lavori in vasca (≠ starts_at, che include il viaggio)
  add column window_end     timestamptz,      -- fine lavori
  add column lanes          int not null default 1,      -- corsie disponibili in parallelo
  add column setup_min      int not null default 5,      -- reset telecamera / cambio atleta
  add column warmup_lead_min int not null default 30,    -- quanto prima entra a scaldare
  add column travel_before_min int not null default 0,   -- viaggio andata → oscura l'agenda
  add column travel_after_min  int not null default 0,
  add column runsheet_status text not null default 'draft'
    check (runsheet_status in ('draft','published'));

-- 1.2 Catalogo test (riusabile su più eventi, gestito dal coach)
create table public.tests (
  id           uuid primary key default gen_random_uuid(),
  code         text unique not null,        -- es. sprint25, tec50sl, virata, partenza, subacquea
  name         text not null,
  description  text,
  stroke       text,                        -- SL|DS|RA|DF|MX|null
  distance_m   int,
  duration_min int not null,                -- tempo REALE in acqua (esecuzione + ripetizione)
  angles       text[] default '{superficie}', -- superficie | subacquea | frontale | laterale
  equipment    text[],
  active       bool not null default true,
  sort         int not null default 0
);

insert into public.tests (code,name,stroke,distance_m,duration_min,angles,sort) values
  ('tec_sl','Tecnica stile libero','SL',50,15,'{superficie,subacquea}',1),
  ('tec_ds','Tecnica dorso','DS',50,15,'{superficie,subacquea}',2),
  ('tec_ra','Tecnica rana','RA',50,15,'{superficie,subacquea,frontale}',3),
  ('tec_df','Tecnica delfino','DF',50,15,'{superficie,subacquea}',4),
  ('partenza','Partenza dal blocco',null,15,10,'{laterale,superficie}',5),
  ('virata','Virata e uscita',null,25,10,'{laterale,subacquea}',6),
  ('sprint','Test di velocità 25m',null,25,10,'{superficie}',7),
  ('subacquea','Subacquea e ondulazione',null,15,10,'{subacquea,laterale}',8);

-- 1.3 Quali test sono offerti in QUESTO evento (il coach cura la griglia)
create table public.event_tests (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  test_id     uuid not null references public.tests(id),
  capacity    int,                    -- null = illimitato entro la capienza evento
  price_cents int not null default 0, -- 0 = incluso nella quota evento
  unique (event_id, test_id)
);

-- 1.4 Test scelti dal nuotatore all'iscrizione
create table public.signup_tests (
  id        uuid primary key default gen_random_uuid(),
  signup_id uuid not null references public.event_signups(id) on delete cascade,
  test_id   uuid not null references public.tests(id),
  unique (signup_id, test_id)
);

-- 1.5 LA SCALETTA (il cuore). Una riga per atleta.
create table public.runsheet (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  signup_id    uuid not null references public.event_signups(id) on delete cascade,
  position     int  not null,                 -- ordine di chiamata (1, 2, 3…)
  lane         int  not null default 1,
  warmup_at    timestamptz not null,          -- ORDINE DI RISCALDAMENTO
  test_at      timestamptz not null,          -- ORDINE DI INGRESSO AL TEST
  out_at       timestamptz not null,          -- ORDINE DI USCITA
  duration_min int  not null,                 -- somma test scelti + setup
  status       text not null default 'atteso'
               check (status in ('atteso','riscaldamento','in_acqua','fatto','assente')),
  coach_note   text,
  unique (event_id, signup_id),
  unique (event_id, position)
);

create index on public.runsheet (event_id, test_at);

-- 1.6 RLS
alter table public.tests         enable row level security;
alter table public.event_tests   enable row level security;
alter table public.signup_tests  enable row level security;
alter table public.runsheet      enable row level security;

create policy r_tests  on public.tests       for select to authenticated using (active);
create policy w_tests  on public.tests       for all    to authenticated using (is_coach()) with check (is_coach());
create policy r_etests on public.event_tests for select to authenticated using (true);
create policy w_etests on public.event_tests for all    to authenticated using (is_coach()) with check (is_coach());

create policy r_stests on public.signup_tests for select to authenticated
  using (is_coach() or exists (select 1 from public.event_signups s
         where s.id = signup_id and s.swimmer_id = auth.uid()));
create policy c_stests on public.signup_tests for insert to authenticated
  with check (is_coach() or exists (select 1 from public.event_signups s
         where s.id = signup_id and s.swimmer_id = auth.uid()));
create policy d_stests on public.signup_tests for delete to authenticated
  using (is_coach() or exists (select 1 from public.event_signups s
         where s.id = signup_id and s.swimmer_id = auth.uid()));

-- Il nuotatore vede la scaletta SOLO se pubblicata, e SOLO la sua riga.
create policy r_run on public.runsheet for select to authenticated using (
  is_coach() or (
    exists (select 1 from public.events e where e.id = event_id and e.runsheet_status = 'published')
    and exists (select 1 from public.event_signups s where s.id = signup_id and s.swimmer_id = auth.uid())
  )
);
create policy w_run on public.runsheet for all to authenticated using (is_coach()) with check (is_coach());
```

**Nota su `blocks_calendar`**: per un evento videoanalisi il blocco dell'agenda va da `starts_at − travel_before_min` a `ends_at + travel_after_min`. Il tuo slot engine (S6) deve leggere questo range, non `window_start/window_end`. Trasferta a 200 km = giornata intera bruciata, l'agenda deve saperlo.

---

## 2. Motore della scaletta — `lib/events/runsheet.ts`

Funzione **pura e deterministica**. Non è "AI": è aritmetica. Il coach resta l'unico a decidere l'ordine.

```ts
export interface Participant {
  signupId: string;
  name: string;
  testDurations: number[];   // durate dei test scelti
  position: number;          // ordine deciso dal coach (default: ordine di iscrizione)
}

export interface EventCfg {
  windowStart: Date; windowEnd: Date;
  lanes: number; setupMin: number; warmupLeadMin: number;
}

export function buildRunsheet(ps: Participant[], cfg: EventCfg) {
  const laneClock = Array(cfg.lanes).fill(cfg.windowStart);   // un orologio per corsia
  const rows = [];

  for (const p of [...ps].sort((a, b) => a.position - b.position)) {
    const dur = p.testDurations.reduce((a, b) => a + b, 0) + cfg.setupMin;

    // assegna alla corsia che si libera prima → riempimento naturale
    const lane = laneClock.indexOf(minDate(laneClock));
    const testAt = laneClock[lane];
    const outAt  = addMinutes(testAt, dur);

    rows.push({
      signupId: p.signupId, lane: lane + 1, durationMin: dur,
      warmupAt: maxDate(cfg.windowStart, subMinutes(testAt, cfg.warmupLeadMin)),
      testAt, outAt,
    });
    laneClock[lane] = outAt;
  }

  const finish  = maxDate(...laneClock);
  const overrun = diffMinutes(finish, cfg.windowEnd);   // >0 = sforo

  return { rows, finish, overrun, capacityLeft: -overrun };
}
```

**Ricalcolo a cascata**: ogni drag&drop del coach → ricalcolo di tutta la scaletta, salvataggio in una sola `upsert` transazionale. Nessun orario scritto a mano.

**Semaforo di capienza** (sempre visibile mentre le iscrizioni arrivano):
| Stato | Condizione | Messaggio |
|---|---|---|
| 🟢 | `overrun < -30` | *"Ci stai comodo: restano 45 min. Puoi accettare ancora ~3 nuotatori."* |
| 🟡 | `-30 ≤ overrun ≤ 0` | *"Mezza giornata piena. Chiudi le iscrizioni."* |
| 🔴 | `overrun > 0` | *"Sfori di 25 min. Opzioni: aggiungi una corsia · togli un test a 2 nuotatori · sposta 1 al pomeriggio."* |

Il sistema **non decide da solo**: propone le tre leve, tu scegli.

---

## 3. UI Coach — tab `Eventi → Videoanalisi`

### 3.1 Creazione (in anticipo, anche mesi prima)
Form in 3 blocchi:
1. **Dove e quando** — titolo, sede (con indirizzo, es. *Piscina di Grosseto*), data, `window_start`/`window_end` (es. 9:00–13:00), viaggio A/R in minuti → mostra: *"Ti blocca l'agenda dalle 7:00 alle 15:30"*.
2. **Come lavoro** — corsie (1–3), setup telecamera (default 5'), anticipo riscaldamento (default 30').
3. **Griglia test** — checkbox sul catalogo `tests`. Per ognuno: attivo ✓, capienza, prezzo (0 = incluso). Sotto, in tempo reale:
   > *"Con 4 ore, 1 corsia e un pacchetto medio da 25' → **~9 nuotatori**. Con 2 corsie → **~18**."*

   Questo numero è la vera **capienza**, e va scritto in `events.capacity` in automatico (modificabile a mano).

### 3.2 Iscrizioni (man mano che arrivano)
Tabella: nuotatore · test scelti (chip) · durata · pagato · stato. In alto il **semaforo di capienza**. Azioni: accetta, metti in lista d'attesa, aggiungi test a mano.

### 3.3 Scaletta (il giorno prima)
- Bottone **`Genera scaletta`** → riempie `runsheet` con l'ordine di iscrizione.
- Lista **drag&drop**: trascini un nuotatore, tutti gli orari si ricalcolano sotto.
- Ordinamenti rapidi: *per test simili* (raggruppa chi fa la stessa cosa → meno spostamenti di telecamera), *per corsia*, *manuale*.
- Ogni riga mostra: `#3 · 09:40 riscaldamento · 10:10 in acqua · 10:35 fuori · corsia 2 · [tec_sl] [virata]`.
- **`Pubblica scaletta`** → `runsheet_status='published'`, ognuno riceve **solo il suo orario** (email + .ics + notifica in app). Finché è `draft`, il nuotatore non vede nulla.

### 3.4 Vista LIVE (il giorno stesso, sul telefono a bordo vasca)
Schermata a colonna singola, font grande, dark:
- In cima: **ORA IN ACQUA** → nome, test, tempo trascorso.
- Sotto: **PROSSIMO** → nome, "chiamalo tra 4 min".
- Sotto ancora: chi sta scaldando.
- Un tap per riga: `riscaldamento → in_acqua → fatto` / `assente`.
- Se sei in ritardo di 12 minuti, lo dice: *"Ritardo 12'. Fine stimata 13:12."* — così decidi tu se tagliare.

---

## 4. UI Nuotatore (PWA)

**Prima** (iscrizione):
> **Videoanalisi · Piscina di Grosseto · sab 12 set, mattina**
> Scegli cosa vuoi analizzare:
> `☑ Tecnica stile libero (15')` `☐ Partenza dal blocco (10')` `☑ Virata e uscita (10')` …
> **Il tuo pacchetto: 25 minuti in acqua.** 6 posti rimasti.
> → **Iscriviti**

**Dopo** (scaletta pubblicata) — card in home:
> **Il tuo orario · sab 12 set**
> 🔵 **09:40** — entra a scaldare
> 🟢 **10:10** — sei in acqua, corsia 2
> ⚪ **10:35** — fine
> *Presentati 15 minuti prima. Porta pinne e palette.*
> `[Aggiungi al calendario]`

Micro-copy: mai mostrare la scaletta degli altri. Il nuotatore vede **il suo slot**, punto.

---

## 5. Aggancio ai video (chiude il cerchio)

Alla chiusura dell'evento: per ogni riga `runsheet` con `status='fatto'`, crea automaticamente una voce nella **coda video** esistente (bucket `race-videos`, cartella per utente), taggata `event_id` + `test_code`.
→ Carichi le clip dopo, le agganci al nuotatore giusto, commenti dalla coda che già usi.
→ Per i 1:1 l'analisi è **inclusa**; per gli Open vale la regola "Offrimi una birra" già implementata.

Nessun altro flusso nuovo: la videoanalisi *alimenta* la macchina che hai già.

---

## 6. Checklist di collaudo (aggiungi a STATO.md)

- [ ] Creo evento videoanalisi 9:00–13:00, 1 corsia, setup 5', riscaldamento 30'. Capienza stimata coerente.
- [ ] Attivo 6 test nella griglia. Un nuotatore ne sceglie 2 → vede "25 minuti in acqua".
- [ ] 15 iscritti → semaforo 🔴 con sforo e le 3 leve proposte. Passo a 2 corsie → 🟢.
- [ ] `Genera scaletta` → orari coerenti, nessuna sovrapposizione sulla stessa corsia.
- [ ] Sposto il 7° al 2° posto → tutti gli orari sotto si ricalcolano, nessun buco.
- [ ] Scaletta in `draft` → il nuotatore **non** vede orari (verifica RLS, non solo la UI).
- [ ] `Pubblica` → ognuno vede **solo** il suo orario, riceve .ics.
- [ ] Vista LIVE: segno "assente" il 4° → la scaletta **non** si riscrive da sola (gli orari restano; decidi tu se ricompattare con un bottone esplicito).
- [ ] L'evento oscura l'agenda prenotazioni incluso viaggio A/R.
- [ ] A evento chiuso, i "fatto" compaiono nella coda video con il tag del test.
```

---

## 7. Parametri che restano tuoi

| Parametro | Default | Dove |
|---|---|---|
| Setup telecamera tra atleti | 5 min | `events.setup_min` |
| Anticipo riscaldamento | 30 min | `events.warmup_lead_min` |
| Corsie in parallelo | 1 | `events.lanes` |
| Durata singolo test | 10–15 min | `tests.duration_min` |
| Ricompattazione dopo un'assenza | **manuale** | bottone esplicito, mai automatico |
