-- ============================================================
-- GLIDE — migration_033_readiness_note_coach.sql
--
-- Onda 27.1 — Feedback/nota post-allenamento visibili al coach.
--
-- BUG chiuso: il nuotatore scrive già una "nota per Alessio" nel check-in
-- post-sessione (`readiness.note`, dentro `readiness-actions.ts` da quando
-- esiste il check-in v2), ma la vista `v_readiness` — l'UNICA fonte che il
-- coach legge in scheda nuotatore — non la esponeva. Nessuna nota è mai
-- arrivata al coach finora. Qui si espone SOLO la colonna già raccolta col
-- consenso implicito del flusso ("una nota per Alessio"): nessun dato nuovo,
-- nessuna nuova raccolta (coerente col vincolo GDPR-tecnico di Onda 25).
--
-- Espone anche `workout_id` (già in tabella, mai in vista) per permettere al
-- coach di risalire a quale scheda/Open si riferisce il feedback — utile SIA
-- per gli 1:1 SIA per il Canale Open (finora il legame non era leggibile).
--
-- Additiva pura: `create or replace view`, nessun DROP, nessuna nuova tabella.
-- ============================================================

-- NB: `create or replace view` in Postgres richiede che le colonne ESISTENTI
-- restino allo stesso nome/posizione — le colonne nuove vanno accodate in
-- fondo (42P16 se si prova a inserirle in mezzo). `nota`/`workout_id` sono
-- perciò dopo `effetto_acqua`, non subito dopo `health_flag`.
create or replace view public.v_readiness
with (security_invoker = true) as
select
  r.id, r.swimmer_id, r.created_at,
  r.sleep as sonno, r.energia, r.corpo,
  r.mood as umore_pre, r.motivation as motivazione,
  r.rpe, r.umore_post, r.main_set_sig, r.pain_sites, r.health_flag,
  round(((r.sleep + r.energia + r.corpo)::numeric / 3), 2) as readiness_fisica,
  round(((r.mood  + r.motivation)::numeric      / 2), 2)   as readiness_mentale,
  (r.umore_post - r.mood)                                  as effetto_acqua,
  r.note as nota, r.workout_id
from public.readiness r;
