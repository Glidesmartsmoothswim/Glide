-- ============================================================
-- GLIDE — migration_003_efficiency_window.sql
-- APPLICATA su Supabase il 2026-07-14.
--
-- Curva di efficienza (FASE 1.3): la finestra di 8 settimane vive nella
-- vista stessa, così l'app non calcola date in fase di render.
-- (GLIDE_QUESTIONARIO §5: mostrare solo con >= 6 punti in 8 settimane.)
-- ============================================================
create or replace view public.v_efficiency_points
with (security_invoker = true) as
select swimmer_id, created_at, main_set_sig, rpe, readiness_fisica
from public.v_readiness
where main_set_sig is not null
  and rpe is not null
  and readiness_fisica >= 3.5
  and created_at >= (now() - interval '8 weeks');
