-- ============================================================
-- GLIDE — migration_035_marketing_anon_scope.sql
-- `marketing.leads`/`marketing.test_results` sono tabelle "fantasma": non
-- create da nessuna migration di questo repo (origine esterna, verosimilmente
-- un funnel/quiz marketing collegato allo stesso progetto Postgres — vedi
-- SECURITY_AUDIT.md, indagine 21 ago). RLS gia attiva ma senza policy (deny-all
-- per anon/authenticated, solo service_role leggeva/scriveva) — verificato di
-- nuovo prima di questa migration: nessuna policy preesistente da duplicare o
-- contraddire, nessun grant preesistente per anon/authenticated/public.
--
-- Qui si apre SOLO la scrittura pubblica minima necessaria (form anonimo che
-- invia lead/risultati quiz): anon puo fare INSERT, mai SELECT/UPDATE/DELETE.
-- ============================================================

grant usage on schema marketing to anon;
grant insert on marketing.leads to anon;
grant insert on marketing.test_results to anon;
-- nessun select/update/delete per anon: solo scrittura, mai lettura

alter table marketing.leads enable row level security;
alter table marketing.test_results enable row level security;

create policy leads_public_insert on marketing.leads
  for insert to anon with check (true);
create policy test_results_public_insert on marketing.test_results
  for insert to anon with check (true);
