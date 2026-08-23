-- ============================================================
-- GLIDE — migration_037_workouts_self_kind.sql  (Onda 29.5 · ADR-012)
-- Builder allenamento self-service, Canale Open: il nuotatore (tier
-- open/open_plus) può scriversi una seduta propria — kind='self'.
--
-- Non è una scrittura del coach (ADR-001 non tocca l'AI qui, ma lo spirito
-- vale anche per il self-service: NON è mai spacciato per "scritto da
-- Alessio" — vedi la UI, label "Il tuo allenamento"). RESTA fuori dal
-- Canale Open pubblico e dall'aderenza al programma (lato app: query e
-- source di workout_completions filtrate, non qui — schema/RLS soltanto).
-- ============================================================

alter table public.workouts drop constraint workouts_kind_check;
alter table public.workouts add constraint workouts_kind_check
  check (kind = any (array['personal', 'open_channel', 'template', 'self']));

-- La policy "workouts: lettura" esistente già copre il self (OR swimmer_id =
-- auth.uid(), qualunque kind) — nessuna nuova policy SELECT necessaria.
-- La policy "workouts: solo coach scrive" resta invariata per gli altri kind.

create policy "workouts: nuotatore scrive il proprio self"
  on public.workouts for insert
  with check (kind = 'self' and swimmer_id = auth.uid());

create policy "workouts: nuotatore aggiorna il proprio self"
  on public.workouts for update
  using (kind = 'self' and swimmer_id = auth.uid())
  with check (kind = 'self' and swimmer_id = auth.uid());

create policy "workouts: nuotatore elimina il proprio self"
  on public.workouts for delete
  using (kind = 'self' and swimmer_id = auth.uid());
