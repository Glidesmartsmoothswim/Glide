-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- Traccia della correzione eseguita sul live il 14/09/2026.
-- Segnalazione della nuotatrice: «sulle lezioni usate ce ne sono 2 in più che
-- non ho fatto. La prima l'ho fatta il 5/09, la seconda il 12/09, poi ho
-- prenotato per il 19/09».
--
-- Sta in scripts/ e non in supabase/migrations/ come le altre correzioni sui
-- dati (ricavi-correzioni-2026-09-12.sql): non tocca lo schema e vale per una
-- riga sola. NON è da rilanciare — le clausole di stato lo rendono innocuo se
-- ripetuto, ma resta un registro, non uno strumento.
-- ============================================================

-- --- 1. Cosa aveva in mano -------------------------------------------------
--
-- profiles  44e2389f-95dc-46ea-9b86-4c23f435f368
--   Flavia Berti Lorenzi · flaviabl75@gmail.com · iscritta 03/09/2026
--   Pacchetto da 10 token private_lesson emessi l'11/09 (package_purchases).
--
-- Quattro token risultavano riscattati su quattro prenotazioni, ma le
-- prenotazioni erano tre e le lezioni svolte due:
--
--   ddc9231d  05/09 09:45  completed  token   ← fatta davvero
--   f8a12bef  12/09 11:00  completed  token   ← fatta davvero
--   c8799d54  19/09 11:00  completed  token   ← NON ancora fatta
--   530b2dc5  19/09 11:00  pending    token   ← doppione dello stesso slot
--
-- --- 2. Come ci è finita ----------------------------------------------------
--
-- Dal ledger (activity_events, append-only: non si riscrive, si legge):
--
--   13/09 08:39:31  booking.created    c8799d54   la nuotatrice prenota il 19/09
--   13/09 20:34:30.382  booking.confirmed  c8799d54
--   13/09 20:34:30.992  booking.completed  c8799d54   ← 610 ms dopo
--   13/09 21:12:56  booking.created    530b2dc5   riprenota lo stesso 19/09
--
-- Seicentodieci millisecondi separano «confermata» da «fatta»: non è una
-- valutazione del coach su una lezione del 19/09, è un secondo clic. Nella
-- scheda dell'agenda il tasto «Presente» compariva nello stesso identico punto
-- dove stava «Conferma lezione» (stessa griglia, stessa colonna, stesso blu).
-- Chiusa la lezione, per la nuotatrice spariva dalle prossime: mezz'ora dopo
-- l'ha riprenotata, e il secondo token se n'è andato.
--
-- La causa è corretta nel codice insieme a questa traccia: canMarkAttendance()
-- in src/lib/booking/attendance.ts — Presente/Assente esistono solo da quando
-- la lezione è cominciata, nella UI e, in modo vincolante, nella server action.

-- --- 3. Le istruzioni eseguite ---------------------------------------------

-- Il doppione del 19/09 (quello creato alle 21:12) viene annullato.
update public.bookings
   set status = 'cancelled', cancelled_at = now()
 where id = '530b2dc5-5319-4978-a41d-cc04cf190166'
   and status = 'pending';

-- Il token che aveva bruciato torna spendibile.
update public.lesson_tokens
   set redeemed_at = null, redeemed_booking_id = null
 where redeemed_booking_id = '530b2dc5-5319-4978-a41d-cc04cf190166';

-- La lezione del 19/09 non è ancora stata svolta: da 'completed' a 'confirmed'.
-- Il token resta impegnato, com'è giusto per una lezione prenotata.
update public.bookings
   set status = 'confirmed'
 where id = 'c8799d54-18b5-440d-aa7d-bc8e525e1aaa'
   and status = 'completed';

-- Il ledger è append-only (ADR-003): la riga booking.completed del 13/09 resta
-- dov'è, perché quel clic è successo davvero. Si aggiunge la correzione.
insert into public.activity_events (user_id, type, payload) values
  ('44e2389f-95dc-46ea-9b86-4c23f435f368', 'booking.cancelled',
   '{"booking_id":"530b2dc5-5319-4978-a41d-cc04cf190166","refunded":true,"correction":true}'::jsonb),
  ('44e2389f-95dc-46ea-9b86-4c23f435f368', 'booking.confirmed',
   '{"booking_id":"c8799d54-18b5-440d-aa7d-bc8e525e1aaa","correction":true}'::jsonb);

-- --- 4. Verifica fatta dopo -------------------------------------------------
--
--   ddc9231d  05/09  completed  1 token   lezione fatta
--   f8a12bef  12/09  completed  1 token   lezione fatta
--   c8799d54  19/09  confirmed  1 token   prenotata
--   530b2dc5  19/09  cancelled  0 token   annullata
--
--   lesson_tokens: 10 totali · 3 impegnati · 7 disponibili
--
-- Coincide con quanto dice la nuotatrice: due lezioni fatte e una prenotata.
