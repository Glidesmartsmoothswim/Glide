-- ============================================================
-- GLIDE — migration_004_backfill_ledger.sql
--
-- Popola il ledger append-only `activity_events` dalle sedute e dai video
-- GIÀ a DB, così Onda / XP / Glide Score partono con lo storico reale.
--
-- IDEMPOTENTE: gira solo se activity_events è VUOTO. Rilanciarla non duplica.
-- occurred_at = created_at storico (quando è successo davvero, non ora).
--
-- Regole payload rispettate (ADR-004):
--   readiness.pre  → solo scale + health_flag booleano (MAI le sedi del dolore)
--   readiness.post → solo rpe/umore_post + has_note booleano (MAI la nota)
--   workout.completed → metri/zone lasciati null: si ricalcolano a valle dai
--                       blocchi (parsing applicativo, non SQL). backfill:true.
-- ============================================================

do $$
begin
  if (select count(*) from public.activity_events) > 0 then
    raise notice 'activity_events non è vuoto: backfill SALTATO.';
    return;
  end if;

  -- readiness.pre
  insert into public.activity_events (user_id, type, payload, occurred_at, created_at)
  select
    r.swimmer_id,
    'readiness.pre',
    jsonb_build_object(
      'sleep',       r.sleep,
      'energia',     r.energia,
      'corpo',       r.corpo,
      'umore',       r.mood,
      'motivazione', r.motivation,
      'health_flag', coalesce(r.health_flag, false),
      'backfill',    true
    ),
    r.created_at, r.created_at
  from public.readiness r
  where r.phase = 'pre';

  -- readiness.post
  insert into public.activity_events (user_id, type, payload, occurred_at, created_at)
  select
    r.swimmer_id,
    'readiness.post',
    jsonb_build_object(
      'rpe',        r.rpe,
      'umore_post', r.umore_post,
      'has_note',   (r.note is not null and length(btrim(r.note)) > 0),
      'workout_id', r.workout_id,
      'backfill',   true
    ),
    r.created_at, r.created_at
  from public.readiness r
  where r.phase = 'post';

  -- workout.completed (dai post legati a un allenamento; metri ricalcolati a valle)
  insert into public.activity_events (user_id, type, payload, occurred_at, created_at)
  select
    r.swimmer_id,
    'workout.completed',
    jsonb_build_object(
      'workout_id', r.workout_id,
      'meters',     null,
      'minutes',    null,
      'backfill',   true
    ),
    r.created_at, r.created_at
  from public.readiness r
  where r.phase = 'post' and r.workout_id is not null;

  -- video.uploaded
  insert into public.activity_events (user_id, type, payload, occurred_at, created_at)
  select
    v.swimmer_id,
    'video.uploaded',
    jsonb_build_object('video_id', v.id, 'backfill', true),
    v.created_at, v.created_at
  from public.race_videos v;

  raise notice 'Backfill ledger completato.';
end $$;
