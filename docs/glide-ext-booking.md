# GLIDE — Estensione BOOKING & EVENTI (Sprint S6)
> Da incollare in Claude Code dopo `leggi STATO.md`. Non riscrive lo schema: aggiunge una **migration**.

---

## 0. Regole d'ingaggio

```
MODALITÀ AUTONOMA (acceptEdits). Non chiedere conferma per file/comandi (npm, next, git, supabase).
Fermati solo per: chiavi mancanti, azioni distruttive, dati sensibili.
Vincoli: brand token invariati (Ink #0B1220, Turchese #00FFE6, Navy #203979, Blu #0E5EAB, Teal #0B7A6E;
Oswald titoli + Montserrat UI, voce "tu", tono Esploratore). RLS sempre attiva, mai aggirata lato client.
Timezone applicativa fissa: Europe/Rome. Nessuna automazione AI di decisioni di carico.
A fine sprint: aggiorna STATO.md, commit, passa oltre.
```

---

## 1. Modello concettuale (leggere prima di scrivere codice)

| Concetto | Significato |
|---|---|
| **Regola di disponibilità** | Finestra ricorrente settimanale del coach (es. lun 12:00–14:30). È un *contenitore*, non uno slot. |
| **Griglia** | Le partenze possibili dentro la finestra, ogni `slot_step` (default **15 min**). |
| **Fine lavori** | `end_time` della finestra = **ultima fine ammessa**, non ultima partenza. → `ultima_partenza = end_time − durata_servizio`. |
| **Prenotazione** | Occupa `[starts_at, ends_at + buffer)`. Ogni slot che interseca questo range **sparisce** dalla griglia. |
| **Servizio** | Determina durata e modalità: vasca (Livorno) o call remota. |
| **Credito** | Lezione inclusa nel pacchetto 1:1, ricaricata a periodo. |

**Esempio canonico da rispettare** — finestra 12:00–14:30, step 15':
- Servizio 60': partenze 12:00, 12:15 … **13:30** (ultima). Se prenoto 12:30→13:30, restano 12:00 (60'), 13:30, 13:45…
- Servizio 30': partenze 12:00 … **14:00** (ultima).
- Con buffer 10': una prenotazione 12:30–13:30 blocca fino alle 13:40 → la prima partenza utile diventa 13:45 (primo punto di griglia libero).

---

## 2. Migration SQL — `supabase/migrations/<ts>_booking.sql`

```sql
create extension if not exists btree_gist;

-- 2.1 Servizi prenotabili
create table public.services (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,          -- pool_60 | pool_30 | call_60 | call_30
  name          text not null,
  mode          text not null check (mode in ('pool','remote')),
  duration_min  int  not null check (duration_min in (30,60)),
  buffer_min    int  not null default 0,
  price_cents   int  not null default 0,       -- 0 = solo a credito / incluso
  credit_cost   int  not null default 1,       -- crediti consumati
  active        bool not null default true,
  sort          int  not null default 0
);

insert into public.services (code,name,mode,duration_min,buffer_min,price_cents,sort) values
  ('pool_60','Lezione in vasca · 60 min','pool',60,10,5000,1),
  ('pool_30','Lezione in vasca · 30 min','pool',30,10,3000,2),
  ('call_60','Call tecnica · 60 min','remote',60,0,4000,3),
  ('call_30','Call tecnica · 30 min','remote',30,0,2500,4);

-- 2.2 Disponibilità ricorrente del coach
create table public.availability_rules (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  weekday     int  not null check (weekday between 0 and 6),   -- 0=domenica
  start_time  time not null,
  end_time    time not null,
  slot_step   int  not null default 15 check (slot_step in (10,15,20,30)),
  modes       text[] not null default '{pool,remote}',          -- cosa è prenotabile in questa finestra
  label       text,                                             -- es. "Pausa pranzo", "Sera"
  valid_from  date not null default current_date,
  valid_to    date,
  active      bool not null default true,
  check (end_time > start_time)
);

-- 2.3 Eccezioni puntuali (chiusure o aperture extra)
create table public.availability_exceptions (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  day         date not null,
  kind        text not null check (kind in ('closed','extra')),
  start_time  time,          -- null + closed = giornata intera chiusa
  end_time    time,
  modes       text[] default '{pool,remote}',
  note        text
);

-- 2.4 Prenotazioni
create table public.bookings (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null references public.profiles(id),
  swimmer_id   uuid not null references public.profiles(id) on delete cascade,
  service_id   uuid not null references public.services(id),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  block_until  timestamptz not null,                -- ends_at + buffer
  mode         text not null check (mode in ('pool','remote')),
  status       text not null default 'confirmed'
               check (status in ('confirmed','cancelled','completed','no_show')),
  payment      text not null default 'credit'
               check (payment in ('credit','paid','free','pending')),
  meet_url     text,                                 -- solo remote
  swimmer_note text,
  coach_note   text,
  created_at   timestamptz default now(),
  cancelled_at timestamptz,
  check (ends_at > starts_at)
);

-- Anti-overlap a livello DB: due booking attivi dello stesso coach non possono intersecarsi.
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    coach_id with =,
    tstzrange(starts_at, block_until, '[)') with &&
  ) where (status in ('confirmed'));

create index on public.bookings (swimmer_id, starts_at desc);
create index on public.bookings (coach_id, starts_at);

-- 2.5 Crediti lezione inclusi nel pacchetto
create table public.lesson_credits (
  id           uuid primary key default gen_random_uuid(),
  swimmer_id   uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  granted      int  not null default 1,
  used         int  not null default 0,
  source       text not null default 'plan',   -- plan | manual | compensation
  note         text,
  unique (swimmer_id, period_start, source)
);

-- Configurazione entitlement per tier (modificabile dal gestionale, NIENTE hardcode)
create table public.plan_entitlements (
  tier            text primary key,             -- elite | open_water | open
  lessons_granted int  not null default 0,
  period          text not null default 'month' check (period in ('month','bimonth')),
  remote_allowed  bool not null default false,
  can_book_extra  bool not null default true    -- può comprare lezioni oltre le incluse
);

insert into public.plan_entitlements (tier,lessons_granted,period,remote_allowed,can_book_extra) values
  ('elite',      1, 'month', true,  true),
  ('open_water', 0, 'month', false, true),
  ('open',       0, 'month', false, true);

-- 2.6 Eventi
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id),
  title       text not null,
  kind        text not null,                    -- vedi §6
  description text,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  location    text,
  mode        text not null default 'pool' check (mode in ('pool','remote','open_water','offsite')),
  capacity    int,                              -- null = illimitato
  price_cents int not null default 0,
  audience    text[] not null default '{elite,open_water,open}',
  status      text not null default 'published' check (status in ('draft','published','cancelled')),
  blocks_calendar bool not null default true,   -- se true, oscura gli slot di prenotazione
  created_at  timestamptz default now()
);

create table public.event_signups (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  swimmer_id uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'in'
             check (status in ('in','waitlist','cancelled','attended')),
  payment    text not null default 'free',
  created_at timestamptz default now(),
  unique (event_id, swimmer_id)
);

-- 2.7 RLS
alter table public.services              enable row level security;
alter table public.availability_rules    enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.bookings              enable row level security;
alter table public.lesson_credits        enable row level security;
alter table public.plan_entitlements     enable row level security;
alter table public.events                enable row level security;
alter table public.event_signups         enable row level security;

-- lettura pubblica (autenticati) su cataloghi e disponibilità
create policy read_services       on public.services              for select to authenticated using (active);
create policy read_avail          on public.availability_rules    for select to authenticated using (active);
create policy read_exc            on public.availability_exceptions for select to authenticated using (true);
create policy read_ent            on public.plan_entitlements     for select to authenticated using (true);
create policy read_events         on public.events                for select to authenticated using (status = 'published' or is_coach());

-- scrittura cataloghi/disponibilità: solo coach
create policy w_services on public.services              for all to authenticated using (is_coach()) with check (is_coach());
create policy w_avail    on public.availability_rules    for all to authenticated using (is_coach()) with check (is_coach());
create policy w_exc      on public.availability_exceptions for all to authenticated using (is_coach()) with check (is_coach());
create policy w_ent      on public.plan_entitlements     for all to authenticated using (is_coach()) with check (is_coach());
create policy w_events   on public.events                for all to authenticated using (is_coach()) with check (is_coach());

-- bookings: il nuotatore vede/crea solo i suoi; il coach tutto
create policy r_book  on public.bookings for select to authenticated using (swimmer_id = auth.uid() or is_coach());
create policy c_book  on public.bookings for insert to authenticated with check (swimmer_id = auth.uid() or is_coach());
create policy u_book  on public.bookings for update to authenticated using (swimmer_id = auth.uid() or is_coach());

create policy r_cred  on public.lesson_credits for select to authenticated using (swimmer_id = auth.uid() or is_coach());
create policy w_cred  on public.lesson_credits for all    to authenticated using (is_coach()) with check (is_coach());

create policy r_sign  on public.event_signups for select to authenticated using (swimmer_id = auth.uid() or is_coach());
create policy c_sign  on public.event_signups for insert to authenticated with check (swimmer_id = auth.uid() or is_coach());
create policy u_sign  on public.event_signups for update to authenticated using (swimmer_id = auth.uid() or is_coach());
```

---

## 3. Slot engine — `lib/booking/slots.ts`

Funzione **pura**, testabile, usata sia lato server (validazione) sia lato client (griglia).

```ts
export type Mode = 'pool' | 'remote';

export interface Rule { weekday:number; start:string; end:string; step:number; modes:Mode[]; }
export interface Busy { start:Date; end:Date; }   // booking.block_until incluso + eventi bloccanti

export interface SlotQuery {
  day: Date;              // giorno richiesto (Europe/Rome)
  durationMin: number;    // 30 | 60
  bufferMin: number;
  mode: Mode;
  rules: Rule[];
  exceptions: { kind:'closed'|'extra'; start?:string; end?:string; modes:Mode[] }[];
  busy: Busy[];
  leadTimeHours: number;  // default 12
  now: Date;
}

export function buildSlots(q: SlotQuery): Date[] {
  const windows = resolveWindows(q);          // regole del weekday + extra − closed, filtrate per mode
  const out: Date[] = [];
  const minStart = addHours(q.now, q.leadTimeHours);

  for (const w of windows) {
    // fine lavori: l'ultima PARTENZA è end − durata
    const lastStart = subMinutes(w.end, q.durationMin);
    for (let t = w.start; t <= lastStart; t = addMinutes(t, w.step)) {
      if (t < minStart) continue;
      const slotEnd = addMinutes(t, q.durationMin + q.bufferMin);
      const clash = q.busy.some(b => t < b.end && slotEnd > b.start);   // overlap classico
      if (!clash) out.push(t);
    }
  }
  return dedupeSorted(out);
}
```

**Test obbligatori** (`__tests__/slots.test.ts`) — devono passare prima di procedere:
1. Finestra 12:00–14:30, step 15, dur 60 → prima 12:00, **ultima 13:30**, totale 7 slot.
2. Stessa finestra, dur 30 → ultima 14:00, totale 9 slot.
3. Booking 12:30–13:30 + buffer 10 → per dur 60 restano solo `12:00` (finisce 13:00? NO: 12:00+60+10=13:10 > 12:30 → **clash**) ⇒ restano `13:45` in poi. Verifica che 12:00 e 12:15 **non** compaiano.
4. Eccezione `closed` sul giorno → array vuoto.
5. `leadTimeHours = 12` → oggi tra 2 ore non è prenotabile.
6. Regola con `modes = ['pool']` → query `mode='remote'` restituisce vuoto.

---

## 4. API routes (Next, server-side, service-role solo dove serve)

| Route | Metodo | Cosa fa |
|---|---|---|
| `/api/booking/slots` | GET `?date=&service=` | Ricalcola gli slot **lato server** (mai fidarsi del client). |
| `/api/booking/create` | POST | Ricontrolla lo slot, verifica credito o pagamento, inserisce booking in **transazione**. L'`EXCLUDE` constraint è la rete di sicurezza contro il doppio-click / race condition: se il DB rifiuta → `409 slot appena occupato`. |
| `/api/booking/cancel` | POST | Se `> cancel_window_hours` (default 24) dall'inizio → restituisce il credito (`used -= 1`); altrimenti no. Status `cancelled`. |
| `/api/booking/ics` | GET | Genera `.ics` per il nuotatore (VEVENT + reminder 24h). |
| `/api/events/signup` | POST | Iscrizione a evento con controllo `capacity` → `waitlist` se pieno. |

**Ordine di consumo per un 1:1**: credito disponibile → usa credito (`payment='credit'`). Nessun credito → se `can_book_extra` mostra il prezzo e passa da Stripe Checkout (`payment='pending'` → `'paid'` al webhook). Se Stripe non è configurato → *modalità simulata*, booking creato con `payment='free'` e badge "simulato".

**Grant crediti**: funzione `ensureCreditPeriod(swimmerId)` chiamata al login e al webhook `invoice.paid`: se non esiste un record per il periodo corrente (mese o bimestre secondo `plan_entitlements.period`), lo crea con `granted = lessons_granted`. Idempotente grazie alla `unique`.

---

## 5. UI — Coach (gestionale, desktop)

**Nuova voce nav: `Agenda`** (icona `CalendarClock`), 3 tab.

1. **Disponibilità** — griglia settimanale 7 colonne. Il coach disegna le finestre (drag o form: giorno, 12:00→14:30, step 15', modalità ✓vasca ✓remoto, etichetta "Pausa pranzo"). Sotto ogni finestra, anteprima live: *"partenze ogni 15' · ultima lezione da 60' alle 13:30"*. Pulsanti rapidi: **Duplica su tutta la settimana**, **Chiudi questo giorno**, **Aggiungi apertura extra**.
2. **Prenotazioni** — vista giorno/settimana a colonne temporali. Ogni booking = card con nome nuotatore, servizio, badge `credito`/`pagato`, nota. Azioni: conferma presenza (`completed`), `no_show`, sposta (drag = cancel+create con stessa validazione), nota coach post-lezione che **si aggancia allo storico del nuotatore**.
3. **Eventi** — lista + form. Campo `blocks_calendar` chiaro: *"Oscura le prenotazioni in queste ore"*.

Colori: vasca = Blu `#0E5EAB`; remoto = Teal `#0B7A6E`; evento = Navy `#203979`; slot libero = bordo Turchese.

---

## 6. UI — Nuotatore (PWA, mobile-first)

Flusso in **3 tap**:
1. **Scegli il servizio** → card grandi: `Vasca 60'` · `Vasca 30'` · `Call 60'` · `Call 30'`. Le call sono visibili solo se `remote_allowed`. Sotto: badge **"1 lezione inclusa questo mese — te ne resta 1"** oppure **"Crediti esauriti · lezione extra €50"**.
2. **Scegli il giorno** → strip orizzontale 14 giorni, i giorni senza slot sono spenti.
3. **Scegli l'ora** → chip degli orari disponibili. Conferma → riepilogo (dove, quando, come pago) → **Prenota**.

Post-prenotazione: card in home *"Prossima lezione: mar 15 lug, 12:30 · Vasca Livorno"*, con **Aggiungi al calendario (.ics)**, link Meet se remota, e **Disdici** (mostra chiaramente: *"gratis fino a 24h prima"*).

Micro-copy vasca: *"Piscina di Livorno"*. Micro-copy call: *"Ci vediamo in video: analisi tecnica, gara e programmazione"*.

---

## 7. Tipi di evento (enum `events.kind` — configurabile, non hardcodato nella UI)

```
clinic_tecnica | test_set | open_water | raduno | gara_master | trasferta
webinar | consulenza_gruppo | challenge | chiusura_piscina
```
`chiusura_piscina` è un evento con `blocks_calendar = true` e nessuna iscrizione: serve al coach per oscurare l'agenda in un colpo solo.

---

## 8. Notifiche (Resend, feature-flag)

| Trigger | A chi | Contenuto |
|---|---|---|
| Prenotazione creata | nuotatore + coach | riepilogo + .ics |
| 24h prima | nuotatore | promemoria + link call se remota |
| Disdetta | coach | slot liberato |
| Evento pubblicato | audience del tier | titolo, data, "Ci sono" |

Se manca `RESEND_API_KEY` → log in console, nessun crash.

---

## 9. Checklist di collaudo (aggiungi a STATO.md)

- [ ] Coach crea finestra lun 12:00–14:30, step 15', solo vasca.
- [ ] Nuotatore Elite vede 7 slot per 60' e 9 per 30'.
- [ ] Prenota 12:30 (60') → gli slot 12:00, 12:15, 12:30, 12:45, 13:00, 13:15 spariscono; resta 13:45.
- [ ] Doppio-click sullo stesso slot da due sessioni → il secondo riceve **409**, nessuna doppia prenotazione.
- [ ] Il credito passa da 1/1 a 0/1; la seconda prenotazione del mese chiede il pagamento.
- [ ] Disdetta a 48h → credito restituito. Disdetta a 3h → credito perso, messaggio chiaro.
- [ ] Nuotatore Open **non** vede le call remote e **non** ha crediti.
- [ ] Evento `chiusura_piscina` mercoledì → nessuno slot prenotabile quel giorno.
- [ ] Nuotatore A non vede le prenotazioni di B (RLS).
- [ ] Ora legale: prenotazione il 25/10 e il 29/03 mantiene l'orario corretto (test `Europe/Rome`).

---

## 10. Decisioni lasciate al coach (già cablate come config, non serve toccare codice)

| Parametro | Dove si cambia | Default proposto |
|---|---|---|
| Lezioni incluse Elite | `plan_entitlements` | **1 al mese** |
| Periodo (mese/bimestre) | `plan_entitlements.period` | `month` |
| Finestra di disdetta | env `BOOKING_CANCEL_HOURS` | 24 |
| Preavviso minimo | env `BOOKING_LEAD_HOURS` | 12 |
| Buffer tra lezioni in vasca | `services.buffer_min` | 10 min |
| Prezzo lezione extra | `services.price_cents` | 50€ / 30€ |
