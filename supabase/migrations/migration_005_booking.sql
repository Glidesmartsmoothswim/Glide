-- ============================================================
-- GLIDE — migration_005_booking.sql  (S7 Booking & Agenda)
--
-- Correzioni sul testo della spec (glide-ext-booking.md):
--  (ADR-007) `events` = CALENDARIO (clinic/gare/chiusure), distinto da
--            `activity_events` = LEDGER. Nomi già separati: nessuna collisione.
--  (ADR-008) `bookings` / `event_signups` / `lesson_credits`: scritture SOLO
--            `is_coach()`. Le azioni del nuotatore (prenota/disdici/iscrivi)
--            passano dalle API server con service-role, che rivalidano slot,
--            credito e capienza. NIENTE write dirette dal client.
--  (ADR-009) palette chiusa: nessun Teal introdotto (è nella UI, non qui).
--  (FASE 0.6) tier adattati ai `service_type` REALI (coaching_1_1|both|open),
--            non agli inventati elite/open_water. Logica invariata.
-- ============================================================

create extension if not exists btree_gist;

-- 2.1 Servizi prenotabili -----------------------------------
create table public.services (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,          -- pool_60 | pool_30 | call_60 | call_30
  name          text not null,
  mode          text not null check (mode in ('pool','remote')),
  duration_min  int  not null check (duration_min in (30,60)),
  buffer_min    int  not null default 0,
  price_cents   int  not null default 0,       -- 0 = solo a credito / incluso
  credit_cost   int  not null default 1,
  active        bool not null default true,
  sort          int  not null default 0
);

insert into public.services (code,name,mode,duration_min,buffer_min,price_cents,sort) values
  ('pool_60','Lezione in vasca · 60 min','pool',60,10,5000,1),
  ('pool_30','Lezione in vasca · 30 min','pool',30,10,3000,2),
  ('call_60','Call tecnica · 60 min','remote',60,0,4000,3),
  ('call_30','Call tecnica · 30 min','remote',30,0,2500,4)
on conflict (code) do nothing;

-- 2.2 Disponibilità ricorrente ------------------------------
create table public.availability_rules (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  weekday     int  not null check (weekday between 0 and 6),   -- 0=domenica
  start_time  time not null,
  end_time    time not null,
  slot_step   int  not null default 15 check (slot_step in (10,15,20,30)),
  modes       text[] not null default '{pool,remote}',
  label       text,
  valid_from  date not null default current_date,
  valid_to    date,
  active      bool not null default true,
  check (end_time > start_time)
);

-- 2.3 Eccezioni puntuali ------------------------------------
create table public.availability_exceptions (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  day         date not null,
  kind        text not null check (kind in ('closed','extra')),
  start_time  time,
  end_time    time,
  modes       text[] default '{pool,remote}',
  note        text
);

-- 2.4 Prenotazioni ------------------------------------------
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
  meet_url     text,
  swimmer_note text,
  coach_note   text,
  created_at   timestamptz default now(),
  cancelled_at timestamptz,
  check (ends_at > starts_at)
);

-- Anti-overlap a livello DB (rete di sicurezza contro doppio-click/race).
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    coach_id with =,
    tstzrange(starts_at, block_until, '[)') with &&
  ) where (status in ('confirmed'));

create index on public.bookings (swimmer_id, starts_at desc);
create index on public.bookings (coach_id, starts_at);

-- 2.5 Crediti + entitlement ---------------------------------
create table public.lesson_credits (
  id           uuid primary key default gen_random_uuid(),
  swimmer_id   uuid not null references public.profiles(id) on delete cascade,
  period_start date not null,
  period_end   date not null,
  granted      int  not null default 1,
  used         int  not null default 0,
  source       text not null default 'plan',
  note         text,
  unique (swimmer_id, period_start, source)
);

create table public.plan_entitlements (
  tier            text primary key,             -- = profiles.service_type REALE
  lessons_granted int  not null default 0,
  period          text not null default 'month' check (period in ('month','bimonth')),
  remote_allowed  bool not null default false,
  can_book_extra  bool not null default true
);

-- Adattato ai service_type reali (era elite/open_water/open nella spec):
--   coaching_1_1 e both → pacchetto 1:1 → 1 lezione/mese + remoto.
--   open → canale Open → nessun credito, niente remoto, ma può comprare extra.
insert into public.plan_entitlements (tier,lessons_granted,period,remote_allowed,can_book_extra) values
  ('coaching_1_1', 1, 'month', true,  true),
  ('both',         1, 'month', true,  true),
  ('open',         0, 'month', false, true)
on conflict (tier) do nothing;

-- 2.6 Eventi (CALENDARIO, non ledger) -----------------------
create table public.events (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null references public.profiles(id),
  title       text not null,
  kind        text not null,
  description text,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  location    text,
  mode        text not null default 'pool' check (mode in ('pool','remote','open_water','offsite')),
  capacity    int,
  price_cents int not null default 0,
  audience    text[] not null default '{coaching_1_1,both,open}',
  status      text not null default 'published' check (status in ('draft','published','cancelled')),
  blocks_calendar bool not null default true,
  created_at  timestamptz default now(),
  check (ends_at > starts_at)
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

create index on public.events (starts_at);
create index on public.event_signups (event_id);

-- 2.7 RLS ---------------------------------------------------
alter table public.services                enable row level security;
alter table public.availability_rules      enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.bookings                enable row level security;
alter table public.lesson_credits          enable row level security;
alter table public.plan_entitlements       enable row level security;
alter table public.events                  enable row level security;
alter table public.event_signups           enable row level security;

-- letture (autenticati)
create policy read_services on public.services              for select to authenticated using (active);
create policy read_avail    on public.availability_rules    for select to authenticated using (active);
create policy read_exc      on public.availability_exceptions for select to authenticated using (true);
create policy read_ent      on public.plan_entitlements     for select to authenticated using (true);
create policy read_events   on public.events                for select to authenticated using (status = 'published' or public.is_coach());

-- scrittura cataloghi/disponibilità/eventi: solo coach
create policy w_services on public.services                for all to authenticated using (public.is_coach()) with check (public.is_coach());
create policy w_avail    on public.availability_rules      for all to authenticated using (public.is_coach()) with check (public.is_coach());
create policy w_exc      on public.availability_exceptions for all to authenticated using (public.is_coach()) with check (public.is_coach());
create policy w_ent      on public.plan_entitlements       for all to authenticated using (public.is_coach()) with check (public.is_coach());
create policy w_events   on public.events                  for all to authenticated using (public.is_coach()) with check (public.is_coach());

-- bookings (ADR-008): il nuotatore LEGGE i suoi; SCRIVE solo il coach.
-- Le prenotazioni/disdette del nuotatore passano dall'API service-role.
create policy r_book on public.bookings for select to authenticated using (swimmer_id = auth.uid() or public.is_coach());
create policy w_book on public.bookings for all    to authenticated using (public.is_coach()) with check (public.is_coach());

-- crediti: legge il proprio, scrive solo il coach.
create policy r_cred on public.lesson_credits for select to authenticated using (swimmer_id = auth.uid() or public.is_coach());
create policy w_cred on public.lesson_credits for all    to authenticated using (public.is_coach()) with check (public.is_coach());

-- iscrizioni eventi (ADR-008, stesso principio): legge le proprie, scrive
-- solo il coach; l'iscrizione del nuotatore (capienza/waitlist) passa dall'API.
create policy r_sign on public.event_signups for select to authenticated using (swimmer_id = auth.uid() or public.is_coach());
create policy w_sign on public.event_signups for all    to authenticated using (public.is_coach()) with check (public.is_coach());
