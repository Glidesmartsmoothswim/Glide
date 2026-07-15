-- ============================================================
-- GLIDE — migration_007_glide_scores.sql  (FASE 5: Onda + Glide Score)
--
-- Storico settimanale del Glide Score. SEMPRE con algo_version: la formula
-- evolverà, ma lo storico deve restare leggibile (GLIDE_GAMIFICATION §4).
-- Aggregati derivati dal ledger; nessun dato sensibile qui.
-- ============================================================

create table public.glide_scores (
  id           uuid primary key default gen_random_uuid(),
  swimmer_id   uuid not null references public.profiles(id) on delete cascade,
  week         text not null,                 -- ISO "2026-W29"
  onda         int  not null default 0,       -- 0–100
  dims         jsonb not null default '{}'::jsonb,  -- 5 dimensioni 0–100
  score        int  not null default 0,       -- 0–100 (con inerzia ±3)
  frozen       bool not null default false,   -- congelato in Pausa
  algo_version int  not null default 1,
  computed_at  timestamptz not null default now(),
  unique (swimmer_id, week)
);

create index on public.glide_scores (swimmer_id, week desc);

alter table public.glide_scores enable row level security;

-- Il nuotatore legge il PROPRIO score; il coach tutto. Scrittura solo coach
-- (in pratica avviene via service-role dal cron/compute).
create policy r_scores on public.glide_scores
  for select to authenticated using (swimmer_id = auth.uid() or public.is_coach());
create policy w_scores on public.glide_scores
  for all to authenticated using (public.is_coach()) with check (public.is_coach());
