-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- GLIDE — migration_047_profiles_group_affiliate_extra_override.sql (Sprint C.3)
-- Affiliazione per il prezzo scontato lezione di gruppo + override discrezionale
-- del prezzo "lezione extra" per singolo nuotatore.
-- ============================================================

alter table public.profiles
  add column group_lesson_affiliate boolean not null default false,
  add column extra_lesson_price_override_cents int null;
