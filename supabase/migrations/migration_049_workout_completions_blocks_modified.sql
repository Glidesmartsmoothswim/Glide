-- ============================================================
-- GLIDE — migration_049_workout_completions_blocks_modified.sql (Sprint C.4)
-- Copia dello "Svolto" (blocks) al completamento, stesso shape di
-- workouts.blocks. `modified` = true quando il nuotatore corregge lo
-- svolto rispetto alla copia originale (editor leggero post-sessione).
-- ============================================================

alter table public.workout_completions
  add column blocks jsonb not null default '[]'::jsonb,
  add column modified boolean not null default false;
