-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- GLIDE — migration_051_terms_privacy_reconsent.sql (pre-lancio, 30/08 sera)
-- Gate di re-consenso (docs/legal/GLIDE_CONSENSI.md §6, versione minima):
-- accettazione Termini + Informativa Privacy per gli account swimmer già
-- iscritti prima che queste pagine esistessero. NULL = deve accettare al
-- prossimo accesso. Non copre i consensi granulari C1/C2/C3 (salute/video/
-- marketing) del doc — quelli restano bozza, non toccati qui.
-- ============================================================

alter table public.profiles
  add column terms_privacy_accepted_at timestamptz null;
