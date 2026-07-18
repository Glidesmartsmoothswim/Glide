-- ============================================================
-- GLIDE — migration_013_swimmer_profile.sql  (Onda 11.3)
-- Profilo atleta self-service: dati DICHIARATI (non il calcolo CSS/zone).
-- Additiva: non riscrive nulla dello schema esistente.
-- ============================================================

-- 1) Estensione profilo swimmer (tutto opzionale, riempito dal wizard).
alter table public.profiles
  add column if not exists anno_nascita int,
  add column if not exists categoria text,
  add column if not exists stili_abituali text[] not null default '{}',
  add column if not exists distanze_abituali text[] not null default '{}';

-- 2) Personal best dichiarati.
create table if not exists public.personal_bests (
  id uuid primary key default gen_random_uuid(),
  swimmer_id uuid not null references public.profiles(id) on delete cascade,
  distanza_m int not null,
  stile text not null check (stile in ('SL','DS','RA','DF','MX')),
  vasca text not null check (vasca in ('25','50')),
  tempo_cc int not null check (tempo_cc > 0),
  data_conseguimento date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (swimmer_id, distanza_m, stile, vasca)
);

alter table public.personal_bests enable row level security;

-- 3) RLS: lo swimmer gestisce SOLO i propri PB; il coach li LEGGE.
create policy "pb: lettura propria o coach" on public.personal_bests
  for select to public using (auth.uid() = swimmer_id or public.is_coach());
create policy "pb: lo swimmer inserisce i propri" on public.personal_bests
  for insert to public with check (auth.uid() = swimmer_id);
create policy "pb: lo swimmer aggiorna i propri" on public.personal_bests
  for update to public using (auth.uid() = swimmer_id) with check (auth.uid() = swimmer_id);
create policy "pb: lo swimmer cancella i propri" on public.personal_bests
  for delete to public using (auth.uid() = swimmer_id);

-- 4) Indice FK (coerente con migration_010) + trigger updated_at.
create index if not exists idx_personal_bests_swimmer on public.personal_bests(swimmer_id);

create trigger set_personal_bests_updated_at
  before update on public.personal_bests
  for each row execute function public.set_updated_at();
