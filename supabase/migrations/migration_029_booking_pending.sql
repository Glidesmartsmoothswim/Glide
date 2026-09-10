-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- GLIDE — migration_029_booking_pending.sql  (Onda 24)
--
-- Le prenotazioni ora nascono "da confermare" (pending): il coach le accetta
-- prima che diventino attive. Aggiungiamo lo stato 'pending' e facciamo sì che
-- l'anti-overlap valga anche per le pending (occupano comunque lo slot, così
-- due nuotatori non possono richiedere lo stesso orario).
-- ============================================================

-- 1) Stato 'pending' ammesso ------------------------------------------------
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending','confirmed','cancelled','completed','no_show'));

-- 2) Anti-overlap esteso alle pending --------------------------------------
alter table public.bookings drop constraint if exists bookings_no_overlap;
alter table public.bookings add constraint bookings_no_overlap
  exclude using gist (
    coach_id with =,
    tstzrange(starts_at, block_until, '[)') with &&
  ) where (status in ('pending','confirmed'));
