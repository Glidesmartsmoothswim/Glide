-- ============================================================
-- GLIDE — migration_030_role_lock.sql  (Security S-1 · C-1)
--
-- Difesa in profondità sull'escalation di ruolo (ADR-006 D1, variante "entrambi").
-- Le "bretelle" esistono già: trigger protect_role_column (015) + protect_tier_column
-- (019). Qui aggiungiamo la "cintura" a livello di POLICY: chi aggiorna la PROPRIA
-- riga non può cambiare `role`. Il coach (is_coach) resta libero (assegna i tier).
--
-- NB: `coach_id` NON esiste su `profiles` in questo repo (modello coach-unico
-- via is_coach(), ADR-002) → la riga coach_id del runbook è OMESSA di proposito.
-- `tier` resta protetto dal suo trigger dedicato: non lo congeliamo qui per non
-- interferire con l'assegnazione legittima del tier da parte del coach/registrazione.
-- ============================================================

drop policy if exists "profili: modifica propria o coach" on public.profiles;

create policy "profili: modifica propria o coach" on public.profiles
  for update to public
  using (id = (select auth.uid()) or public.is_coach())
  with check (
    public.is_coach()
    or (
      id = (select auth.uid())
      and role = (select p.role from public.profiles p where p.id = (select auth.uid()))
    )
  );
