-- ============================================================
-- GLIDE — migration_018_programs.sql  (Sprint V.3 · Programmazione 1:1)
-- programs + program_phases + program_notes (spec §3.2).
-- Sicurezza: `notes` in tabella SEPARATA coach-only — coach e nuotatore sono
-- entrambi ruolo `authenticated`, quindi non si può nascondere una colonna via
-- RLS; isolandola in program_notes il nuotatore non la legge MAI (nemmeno API).
-- ============================================================

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  swimmer_id uuid not null references public.profiles(id) on delete cascade,
  coach_id uuid not null,
  title text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  goal_race_name text,
  goal_race_date date,
  goal_race_pool int check (goal_race_pool in (25, 50)),
  goal_events text[],
  goal_time_target text,
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

-- Note del coach: tabella separata, mai accessibile al nuotatore.
create table if not exists public.program_notes (
  program_id uuid primary key references public.programs(id) on delete cascade,
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.program_phases (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,
  phase_type text not null check (phase_type in
    ('generale', 'specifico', 'gara', 'tapering', 'scarico', 'transizione')),
  start_date date not null,
  end_date date not null,
  focus text,
  check (end_date >= start_date)
);

-- Un solo programma ATTIVO per nuotatore.
create unique index if not exists uniq_active_program_per_swimmer
  on public.programs(swimmer_id) where status = 'active';

-- FK differita da V.2: il tag video → programma.
alter table public.race_videos
  drop constraint if exists race_videos_program_id_fkey;
alter table public.race_videos
  add constraint race_videos_program_id_fkey
  foreign key (program_id) references public.programs(id) on delete set null;

-- Indici FK
create index if not exists idx_programs_swimmer on public.programs(swimmer_id);
create index if not exists idx_phases_program on public.program_phases(program_id);

-- RLS
alter table public.programs enable row level security;
alter table public.program_notes enable row level security;
alter table public.program_phases enable row level security;

-- Coach: pieno controllo. Nuotatore: SELECT solo del proprio programma ATTIVO.
create policy "programs: coach" on public.programs
  for all to public using (public.is_coach()) with check (public.is_coach());
create policy "programs: nuotatore legge il proprio active" on public.programs
  for select to public using (swimmer_id = auth.uid() and status = 'active');

-- Note: SOLO coach (nessuna policy per il nuotatore = nessun accesso).
create policy "program_notes: solo coach" on public.program_notes
  for all to public using (public.is_coach()) with check (public.is_coach());

-- Fasi: coach pieno; nuotatore legge le fasi del proprio programma attivo.
create policy "phases: coach" on public.program_phases
  for all to public using (public.is_coach()) with check (public.is_coach());
create policy "phases: nuotatore del proprio active" on public.program_phases
  for select to public using (exists (
    select 1 from public.programs p
    where p.id = program_phases.program_id
      and p.swimmer_id = auth.uid()
      and p.status = 'active'
  ));
