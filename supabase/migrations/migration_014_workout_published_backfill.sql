-- ============================================================
-- GLIDE — migration_014_workout_published_backfill.sql  (Onda 11.4)
-- La colonna published_at esiste già; le schede personali storiche non la
-- valorizzavano. La riempiamo con created_at (data più sensata disponibile)
-- così la finestra di modifica dei 14 giorni ha sempre una base.
-- ============================================================

update public.workouts
set published_at = created_at
where published_at is null;
