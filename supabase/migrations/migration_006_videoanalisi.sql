-- ============================================================
-- GLIDE — migration_006_videoanalisi.sql  (S8 Evento Videoanalisi)
--
-- Addendum a booking (S7). Un evento videoanalisi NON è una prenotazione:
-- è un contenitore con scaletta interna. Il nuotatore sceglie i TEST, il
-- coach decide l'ORDINE e genera gli orari. Niente scelta oraria dal client.
--
-- Correzioni coerenti col resto: `public.is_coach()`, RLS ovunque,
-- Europe/Rome a livello applicativo. blocks_calendar per videoanalisi va da
-- starts_at−travel_before a ends_at+travel_after (gestito nello slot engine).
-- ============================================================

-- 1.1 Estensione di events (già esistente da S7)
alter table public.events
  add column if not exists format text not null default 'simple'
    check (format in ('simple','videoanalisi')),
  add column if not exists window_start     timestamptz,
  add column if not exists window_end       timestamptz,
  add column if not exists lanes            int not null default 1,
  add column if not exists setup_min        int not null default 5,
  add column if not exists warmup_lead_min  int not null default 30,
  add column if not exists travel_before_min int not null default 0,
  add column if not exists travel_after_min  int not null default 0,
  add column if not exists runsheet_status  text not null default 'draft'
    check (runsheet_status in ('draft','published'));

-- 1.2 Catalogo test (riusabile, curato dal coach)
create table public.tests (
  id           uuid primary key default gen_random_uuid(),
  code         text unique not null,
  name         text not null,
  description  text,
  stroke       text,
  distance_m   int,
  duration_min int not null,
  angles       text[] default '{superficie}',
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
  ('subacquea','Subacquea e ondulazione',null,15,10,'{subacquea,laterale}',8)
on conflict (code) do nothing;

-- 1.3 Test offerti in QUESTO evento
create table public.event_tests (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.events(id) on delete cascade,
  test_id     uuid not null references public.tests(id),
  capacity    int,
  price_cents int not null default 0,
  unique (event_id, test_id)
);

-- 1.4 Test scelti dal nuotatore
create table public.signup_tests (
  id        uuid primary key default gen_random_uuid(),
  signup_id uuid not null references public.event_signups(id) on delete cascade,
  test_id   uuid not null references public.tests(id),
  unique (signup_id, test_id)
);

-- 1.5 La scaletta (una riga per atleta)
create table public.runsheet (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  signup_id    uuid not null references public.event_signups(id) on delete cascade,
  position     int  not null,
  lane         int  not null default 1,
  warmup_at    timestamptz not null,
  test_at      timestamptz not null,
  out_at       timestamptz not null,
  duration_min int  not null,
  status       text not null default 'atteso'
               check (status in ('atteso','riscaldamento','in_acqua','fatto','assente')),
  coach_note   text,
  unique (event_id, signup_id),
  unique (event_id, position)
);

create index on public.runsheet (event_id, test_at);

-- 1.6 RLS
alter table public.tests        enable row level security;
alter table public.event_tests  enable row level security;
alter table public.signup_tests enable row level security;
alter table public.runsheet     enable row level security;

create policy r_tests  on public.tests       for select to authenticated using (active);
create policy w_tests  on public.tests       for all    to authenticated using (public.is_coach()) with check (public.is_coach());
create policy r_etests on public.event_tests for select to authenticated using (true);
create policy w_etests on public.event_tests for all    to authenticated using (public.is_coach()) with check (public.is_coach());

create policy r_stests on public.signup_tests for select to authenticated
  using (public.is_coach() or exists (select 1 from public.event_signups s
         where s.id = signup_id and s.swimmer_id = auth.uid()));
create policy c_stests on public.signup_tests for insert to authenticated
  with check (public.is_coach() or exists (select 1 from public.event_signups s
         where s.id = signup_id and s.swimmer_id = auth.uid()));
create policy d_stests on public.signup_tests for delete to authenticated
  using (public.is_coach() or exists (select 1 from public.event_signups s
         where s.id = signup_id and s.swimmer_id = auth.uid()));

-- Il nuotatore vede la scaletta SOLO se pubblicata, e SOLO la sua riga.
create policy r_run on public.runsheet for select to authenticated using (
  public.is_coach() or (
    exists (select 1 from public.events e where e.id = event_id and e.runsheet_status = 'published')
    and exists (select 1 from public.event_signups s where s.id = signup_id and s.swimmer_id = auth.uid())
  )
);
create policy w_run on public.runsheet for all to authenticated using (public.is_coach()) with check (public.is_coach());
