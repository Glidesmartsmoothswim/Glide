-- ============================================================
-- GLIDE — migration_025_perf_indexes_rls.sql  (Onda 14.2)
-- Interventi evidence-based dalla diagnosi 14.1:
--  1. Indice sulla FK senza copertura (workout_completions.workout_id): serve
--     la clausola RLS di `workouts` e il mantenimento della FK.
--  2. Policy RLS più "calda" riscritta con initplan `(select …)`: `workouts:
--     lettura` chiama is_coach()+my_tier()+subquery PER RIGA. Avvolgendo le
--     funzioni in (select …) Postgres le valuta UNA volta a statement.
-- Le altre policy con auth.uid() per riga hanno impatto attuale ~0 (poche
-- righe, fuori dalle query costose): rinviate a una migrazione di manutenzione.
-- ============================================================

create index if not exists workout_completions_workout_idx
  on public.workout_completions (workout_id);

drop policy if exists "workouts: lettura" on public.workouts;
create policy "workouts: lettura" on public.workouts
  for select to public using (
    (select public.is_coach())
    or swimmer_id = (select auth.uid())
    or (
      kind = 'open_channel' and (
        (select public.my_tier()) = 'open_plus'
        or (
          (select public.my_tier()) = 'open'
          and week_start = date_trunc('week', current_date)::date
        )
      )
    )
    or exists (
      select 1 from public.workout_completions wc
      where wc.workout_id = public.workouts.id
        and wc.swimmer_id = (select auth.uid())
    )
  );
