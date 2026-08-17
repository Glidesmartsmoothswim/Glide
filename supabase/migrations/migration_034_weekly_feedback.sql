-- ============================================================
-- GLIDE — migration_034_weekly_feedback.sql  (Onda 28.2)
-- Feedback settimanale dell'atleta: una volta a settimana l'app propone
-- "come è andata?" (1-5) + argomenti che vorrebbe approfondire (chip da
-- vocabolario chiuso, `lib/feedback.ts`) + una nota libera facoltativa.
-- Alimenta il riepilogo "idee per i prossimi post" su /coach/social.
-- Non sanitario: niente ADR-004 in gioco (nessuna sede di dolore, nessun
-- indice readiness). Una riga per nuotatore+settimana (upsert).
-- ============================================================

create table if not exists public.weekly_feedback (
  id         uuid primary key default gen_random_uuid(),
  swimmer_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,             -- lunedì della settimana (lib/week.ts)
  rating     smallint not null check (rating between 1 and 5),
  topics     text[] not null default '{}',  -- vocabolario lib/feedback.ts
  note       text,
  created_at timestamptz not null default now(),
  unique (swimmer_id, week_start)
);

alter table public.weekly_feedback enable row level security;

-- Il nuotatore legge/scrive il proprio; il coach legge tutto (in aggregato
-- sul planner social, mai il singolo nome fuori dalla scheda nuotatore).
drop policy if exists "weekly_feedback: lettura" on public.weekly_feedback;
create policy "weekly_feedback: lettura" on public.weekly_feedback
  for select using (auth.uid() = swimmer_id or public.is_coach());

drop policy if exists "weekly_feedback: il nuotatore scrive la propria" on public.weekly_feedback;
create policy "weekly_feedback: il nuotatore scrive la propria" on public.weekly_feedback
  for insert with check (auth.uid() = swimmer_id);

drop policy if exists "weekly_feedback: il nuotatore aggiorna la propria" on public.weekly_feedback;
create policy "weekly_feedback: il nuotatore aggiorna la propria" on public.weekly_feedback
  for update using (auth.uid() = swimmer_id) with check (auth.uid() = swimmer_id);

-- Niente policy delete: come readiness, resta un fatto storico.

create index if not exists weekly_feedback_swimmer_week_idx
  on public.weekly_feedback (swimmer_id, week_start desc);
create index if not exists weekly_feedback_week_idx
  on public.weekly_feedback (week_start desc);
