-- ============================================================
-- GLIDE — migration_046_services_duration45_capacity_group.sql (Sprint C.2)
-- Durata 45' per i servizi in vasca, capienza multipla (lezioni di gruppo),
-- catalogo "Lezione di gruppo" (30/45/60). Prezzo di listino 10€ (non
-- affiliato); lo sconto affiliato si applica a runtime (Sprint C.3), non qui.
-- Le 4 righe esistenti restano capacity=1 (comportamento invariato).
-- ============================================================

alter table public.services
  drop constraint services_duration_min_check,
  add constraint services_duration_min_check
    check (duration_min = ANY (ARRAY[30, 45, 60]));

alter table public.services
  add column capacity int not null default 1;

insert into public.services
  (code, name, mode, duration_min, price_cents, credit_cost, capacity, sort) values
  ('group_30', 'Lezione di gruppo · 30 min', 'pool', 30, 1000, 1, 6, 5),
  ('group_45', 'Lezione di gruppo · 45 min', 'pool', 45, 1000, 1, 6, 6),
  ('group_60', 'Lezione di gruppo · 60 min', 'pool', 60, 1000, 1, 6, 7);
