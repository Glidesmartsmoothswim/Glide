-- ============================================================
-- GLIDE — migration_009_security_hardening.sql  (FASE 9, dai security advisors)
-- ============================================================

-- 1) search_path fisso sulle funzioni (evita hijack via schema shadowing).
alter function public.set_updated_at() set search_path = public;
alter function public.is_coach() set search_path = public;
alter function public.handle_new_user() set search_path = public;

-- 2) handle_new_user è un trigger: nessuno deve chiamarla via RPC.
revoke execute on function public.handle_new_user() from anon, authenticated;

-- 3) is_coach serve alle policy per gli utenti loggati; agli anonimi no.
revoke execute on function public.is_coach() from anon;

-- 4) estensioni fuori dallo schema public.
create schema if not exists extensions;
alter extension btree_gist set schema extensions;
