-- ============================================================
-- GLIDE — migration_016_intake.sql  (Sprint V.1 · Intake v2)
-- athlete_type su profiles + onboarding_done (flag spostato da localStorage)
-- + tabella intake (spec §5, SENZA i campi tempi: i tempi vivono in
-- personal_bests, Onda 11.3). RLS: self select/insert/update; coach select.
-- ============================================================

alter table public.profiles
  add column if not exists athlete_type text not null default 'agonista'
    check (athlete_type in ('agonista', 'libero')),
  add column if not exists onboarding_done boolean not null default false;

create table if not exists public.intake (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) unique,
  goal_primary text not null,
  goal_note text,
  freq_settimanale text not null,
  vasca int not null check (vasca in (25, 50)),
  -- percorso A (agonista)
  anni_nuoto text,
  continuita text,
  gare_12m boolean,
  esperienza_intensita boolean,
  device_fc boolean,
  -- percorso B (libero)
  corsi text,
  stili text[],
  autovalutazione int check (autovalutazione between 1 and 5),
  aree_miglioramento text[],
  created_at timestamptz not null default now()
);

alter table public.intake enable row level security;

create policy "intake: lettura self o coach" on public.intake
  for select to public using (auth.uid() = user_id or public.is_coach());
create policy "intake: self insert" on public.intake
  for insert to public with check (auth.uid() = user_id);
create policy "intake: self update" on public.intake
  for update to public using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_intake_user on public.intake(user_id);
