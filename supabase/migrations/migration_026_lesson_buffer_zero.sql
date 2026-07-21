-- ============================================================
-- GLIDE — migration_026_lesson_buffer_zero.sql  (Onda 16)
-- "Passo 0" fra le lezioni: nessun buffer forzato dopo una lezione, così si
-- possono prenotare a ruota (back-to-back). Il default della colonna è già 0
-- (nuovi servizi); qui azzeriamo quelli esistenti (lezioni in vasca = 10 min).
-- ============================================================

update public.services set buffer_min = 0 where buffer_min <> 0;
