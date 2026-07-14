-- ============================================================
-- GLIDE — migration_001_activity_ledger.sql
--
-- ⚠️  SOSTITUISCE migration_001_events.sql (cancellata).
--     La tabella si chiamava `events` ed entrava in collisione con la tabella
--     `events` del calendario (glide-ext-booking §2.6). Vedi ADR-007.
--
-- Ledger append-only. Nessuna UI, nessuna logica modificata.
-- Sorgente di verità per XP, Badge, Glide Score, Glide Journey.
-- Prerequisito: glide-schema.sql già eseguito (serve is_coach()).
-- ============================================================

-- `create table` PURO, non `if not exists`: se il nome è già preso deve FALLIRE
-- rumorosamente. Un errore che tace è peggio di un errore che urla. (ADR-007)
create table public.activity_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,
  payload     jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),  -- quando è successo davvero
  created_at  timestamptz not null default now()   -- quando l'abbiamo scritto
);

create index activity_user_time_idx on public.activity_events (user_id, occurred_at desc);
create index activity_type_time_idx on public.activity_events (type, occurred_at desc);

comment on table public.activity_events is
  'Ledger append-only. NON aggiornare né cancellare righe: gli eventi sono fatti storici.
   NON confondere con `events`, che è il calendario (clinic, gare, trasferte, videoanalisi).';

-- ---------- RLS ----------
alter table public.activity_events enable row level security;

create policy "activity_select" on public.activity_events
  for select using ( auth.uid() = user_id or public.is_coach() );

create policy "activity_insert" on public.activity_events
  for insert with check ( auth.uid() = user_id or public.is_coach() );

-- Nessuna policy UPDATE, nessuna policy DELETE. Append-only per costruzione.

-- ---------- Vocabolario eventi ----------
-- Usare SOLO questi type. Aggiungerne di nuovi è una migration, non un capriccio del client.
--
--   workout.completed    { workout_id, meters, minutes, zones: {z1..z5} }
--   readiness.pre        { session_id, sleep, energia, corpo, umore, motivazione, health_flag }
--   readiness.post       { session_id, rpe, umore_post, has_note }
--   video.uploaded       { video_id }
--   race.logged          { race_id, event, time_ms, pb: bool }
--
--   -- da S7 booking / S8 videoanalisi (ADR-007)
--   booking.created      { booking_id, service_code, mode }
--   booking.completed    { booking_id, service_code }
--   booking.cancelled    { booking_id, refunded: bool }
--   booking.no_show      { booking_id }
--   event.signup         { event_id, kind }
--   videoanalisi.done    { event_id, test_codes: [] }
--
-- Regole payload:
--   - MAI testo libero del nuotatore (solo has_note: true/false)
--   - MAI le sedi del dolore (solo health_flag: true/false)  ← ADR-004
--   - MAI valori derivati (XP, Glide Score): si calcolano a valle, non si scrivono qui
