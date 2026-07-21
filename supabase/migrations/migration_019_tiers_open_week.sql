-- ============================================================
-- GLIDE — migration_019_tiers_open_week.sql  (Onda 12.1 / 12.3)
-- 1) Tier di accesso sul profilo (free/open/open_plus/one_to_one).
-- 2) Guardia anti auto-upgrade del tier (come il role-lock di 015).
-- 3) Settimana (week_start) sugli allenamenti Canale Open.
-- 4) Archivio personale svolti (workout_completions), self-contained.
-- 5) RLS workouts riscritta col gating per tier + "ciò che ho svolto resta mio".
-- I workout 1:1 (kind='personal') NON vengono toccati.
-- ============================================================

-- 1) Tier di accesso -----------------------------------------------------------
alter table public.profiles
  add column if not exists tier text not null default 'free';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_tier_check'
  ) then
    alter table public.profiles
      add constraint profiles_tier_check
      check (tier in ('free','open','open_plus','one_to_one'));
  end if;
end $$;

comment on column public.profiles.tier is
  'Livello di accesso (Onda 12): free default; open/open_plus derivano da '
  'abbonamento Stripe attivo; one_to_one lo assegna il coach.';

-- Tier del chiamante (SECURITY DEFINER, come is_coach()). Default free.
create or replace function public.my_tier()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select tier from public.profiles where id = auth.uid()), 'free');
$$;
revoke execute on function public.my_tier() from public;
grant execute on function public.my_tier() to authenticated, anon;

-- 2) Guardia: un utente client non può cambiarsi il tier da solo ---------------
-- Consentito a: coach (is_coach()) e service_role/postgres (webhook Stripe).
create or replace function public.protect_tier_column()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.tier is distinct from old.tier
     and current_user in ('authenticated', 'anon')
     and not public.is_coach() then
    raise exception 'Modifica del tier non consentita.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.protect_tier_column() from public;

drop trigger if exists protect_tier_column on public.profiles;
create trigger protect_tier_column
  before update on public.profiles
  for each row execute function public.protect_tier_column();

-- 3) Settimana Canale Open -----------------------------------------------------
-- Lunedì di riferimento. NULL sui personal (non ha senso lì).
alter table public.workouts
  add column if not exists week_start date;

comment on column public.workouts.week_start is
  'Onda 12.3: lunedì della settimana Canale Open. Il tier open vede solo la '
  'settimana corrente; open_plus tutto lo storico.';

create index if not exists workouts_open_week_idx
  on public.workouts (week_start)
  where kind = 'open_channel';

-- 4) Archivio personale svolti -------------------------------------------------
-- Self-contained: title/focus/week_start snapshottati così l'archivio "resta
-- mio" anche se l'allenamento viene rimosso o il tier scende a free.
create table if not exists public.workout_completions (
  id uuid primary key default gen_random_uuid(),
  swimmer_id uuid not null references public.profiles(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  title text not null,
  focus text,
  week_start date,
  total_meters integer,
  source text not null default 'open_channel',
  completed_at timestamptz not null default now(),
  unique (swimmer_id, workout_id)
);

alter table public.workout_completions enable row level security;

drop policy if exists "completions: proprie o coach" on public.workout_completions;
create policy "completions: proprie o coach" on public.workout_completions
  for select to public using (swimmer_id = auth.uid() or public.is_coach());

drop policy if exists "completions: il nuotatore inserisce le proprie" on public.workout_completions;
create policy "completions: il nuotatore inserisce le proprie" on public.workout_completions
  for insert to public with check (swimmer_id = auth.uid());

drop policy if exists "completions: il nuotatore rimuove le proprie" on public.workout_completions;
create policy "completions: il nuotatore rimuove le proprie" on public.workout_completions
  for delete to public using (swimmer_id = auth.uid());

create index if not exists completions_swimmer_idx
  on public.workout_completions (swimmer_id, completed_at desc);

-- 5) RLS workouts: gating per tier + "resta mio" -------------------------------
drop policy if exists "workouts: lettura" on public.workouts;
create policy "workouts: lettura" on public.workouts
  for select to public using (
    public.is_coach()
    or swimmer_id = auth.uid()
    or (
      kind = 'open_channel' and (
        public.my_tier() = 'open_plus'
        or (
          public.my_tier() = 'open'
          and week_start = date_trunc('week', current_date)::date
        )
      )
    )
    or exists (
      select 1 from public.workout_completions wc
      where wc.workout_id = public.workouts.id
        and wc.swimmer_id = auth.uid()
    )
  );
