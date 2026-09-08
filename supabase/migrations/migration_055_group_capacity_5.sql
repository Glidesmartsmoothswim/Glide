-- ============================================================
-- GLIDE — migration_055_group_capacity_5.sql
-- (GLIDE_DB_CHANGES_001, blocco M1 — capienza lezioni di gruppo 6 → 5)
--
-- `group_30`/`group_45`/`group_60` erano nate a capacity = 6 (seed di
-- migration_046, valore provvisorio). La capienza decisa è massimo 5.
-- `pool_*` e `call_*` restano a 1: il filtro è su mode = 'group', non su
-- un elenco di codici, così un futuro servizio di gruppo eredita la
-- regola invece di sfuggirle.
--
-- Effetto sulle prenotazioni: il trigger `bookings_check_capacity`
-- (migration_048) conta le prenotazioni attive contro `services.capacity`.
-- Abbassare il tetto NON cancella nulla — le prenotazioni esistenti
-- restano valide, semplicemente da qui in poi non se ne accettano di
-- nuove oltre 5. Pre-verifica eseguita sul progetto live prima di
-- scrivere questa migration (nessuna sessione di gruppo futura oltre i 5):
--
--   select b.starts_at, s.code, count(*)
--     from public.bookings b
--     join public.services s on s.id = b.service_id
--    where s.mode = 'group' and b.status = 'confirmed' and b.starts_at > now()
--    group by 1,2 having count(*) > 5;   -- → 0 righe
--
-- Va rieseguita prima dell'apply se nel frattempo è passato del tempo.
--
-- APPLICATA sul progetto live l'08/09/2026 (MCP, `055_group_capacity_5`), dopo
-- aver rieseguito la pre-verifica riportata sopra: 0 righe. Vedi STATO.md.
-- ============================================================

update public.services
   set capacity = 5
 where mode = 'group';
