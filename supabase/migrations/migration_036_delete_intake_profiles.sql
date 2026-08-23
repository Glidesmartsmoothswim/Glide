-- ============================================================
-- GLIDE — migration_036_delete_intake_profiles.sql
-- Cancellazione puntuale di 9 account (intake + profiles) su richiesta.
--
-- Ordine obbligato: public.intake.user_id → public.profiles(id) SENZA
-- on delete cascade (migration_016), quindi va svuotata prima intake,
-- altrimenti la delete su profiles fallisce per violazione di FK.
--
-- IDEMPOTENTE: IN su id assenti non tocca nulla, si può rilanciare.
-- auth.users NON viene toccata qui: la rimozione dell'utente Supabase
-- Auth resta uno step separato (dashboard/Admin API), fuori da questa
-- migrazione SQL.
-- ============================================================

delete from public.intake where user_id in (
  'd3bfb713-cdb1-43c0-8775-2f39e6b356d5','c14f9f8a-7a52-42ac-b567-0d3ddb029d0f',
  '9b0ec8dd-2cd7-4d59-9814-3f7c36a9b940','cf8b8175-9253-461d-8f91-91191e7cc4b4',
  'ff1364a4-e290-4bfc-8002-81e7e485a25f','0078027b-a756-4c49-bcd4-25aabb8b356b',
  '82af2508-760f-4fae-b509-74c5631e84a4','499f5500-b556-4a5a-88c6-c8385780264d',
  'd57c74e8-c5f0-4e16-9006-0ef54c940220'
);

delete from public.profiles where id in (
  'd3bfb713-cdb1-43c0-8775-2f39e6b356d5','c14f9f8a-7a52-42ac-b567-0d3ddb029d0f',
  '9b0ec8dd-2cd7-4d59-9814-3f7c36a9b940','cf8b8175-9253-461d-8f91-91191e7cc4b4',
  'ff1364a4-e290-4bfc-8002-81e7e485a25f','0078027b-a756-4c49-bcd4-25aabb8b356b',
  '82af2508-760f-4fae-b509-74c5631e84a4','499f5500-b556-4a5a-88c6-c8385780264d',
  'd57c74e8-c5f0-4e16-9006-0ef54c940220'
);
