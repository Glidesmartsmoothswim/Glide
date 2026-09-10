-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- GLIDE — migration_050_open_archive_previous_week.sql (Sprint C.6)
-- Open: archivio esteso da "solo settimana corrente" a "corrente +
-- precedente" (era migration_019). Open Plus: invariato, intero archivio.
-- ============================================================

drop policy if exists "workouts: lettura" on public.workouts;
create policy "workouts: lettura" on public.workouts
  for select to public using (
    public.is_coach()
    or swimmer_id = auth.uid()
    or (
      kind = 'open_channel' and (
        public.my_tier() = 'open_plus'
        or (
          public.my_tier() = 'open'
          and week_start >= date_trunc('week', current_date)::date - interval '7 days'
        )
      )
    )
    or exists (
      select 1 from public.workout_completions wc
      where wc.workout_id = public.workouts.id
        and wc.swimmer_id = auth.uid()
    )
  );
