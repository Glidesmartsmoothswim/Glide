-- ============================================================
-- GLIDE — migration_010_fk_indexes.sql  (FASE 9, dai performance advisors)
-- Indici a copertura delle foreign key senza indice (21 segnalazioni).
-- ============================================================

create index if not exists idx_avail_exc_coach      on public.availability_exceptions (coach_id);
create index if not exists idx_avail_rules_coach    on public.availability_rules (coach_id);
create index if not exists idx_bookings_service     on public.bookings (service_id);
create index if not exists idx_signups_swimmer      on public.event_signups (swimmer_id);
create index if not exists idx_event_tests_test     on public.event_tests (test_id);
create index if not exists idx_events_coach         on public.events (coach_id);
create index if not exists idx_leads_coach          on public.leads (coach_id);
create index if not exists idx_race_videos_coach    on public.race_videos (coach_id);
create index if not exists idx_readiness_workout    on public.readiness (workout_id);
create index if not exists idx_runsheet_signup      on public.runsheet (signup_id);
create index if not exists idx_signup_tests_test    on public.signup_tests (test_id);
create index if not exists idx_social_coach         on public.social_posts (coach_id);
create index if not exists idx_social_source_video  on public.social_posts (source_video_id);
create index if not exists idx_subs_swimmer         on public.subscriptions (swimmer_id);
create index if not exists idx_sb_awarded_by        on public.swimmer_badges (awarded_by);
create index if not exists idx_sb_badge_code        on public.swimmer_badges (badge_code);
create index if not exists idx_tx_swimmer           on public.transactions (swimmer_id);
create index if not exists idx_tx_video             on public.transactions (video_id);
create index if not exists idx_vc_coach             on public.video_comments (coach_id);
create index if not exists idx_vc_video             on public.video_comments (video_id);
create index if not exists idx_workouts_coach       on public.workouts (coach_id);
