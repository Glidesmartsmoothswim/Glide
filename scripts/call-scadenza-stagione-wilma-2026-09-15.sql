-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- Traccia della correzione eseguita sul live il 15/09/2026.
-- Seguito di call-pacchetto-wilma-2026-09-14.sql, che lasciava aperta la
-- domanda sulla scadenza. Risposta del committente: «i check-in devono
-- scadere con la stagione, perché fanno parte del pacchetto stagionale».
--
-- Il giorno prima erano stati emessi senza scadenza, per il principio che un
-- token già pagato non si toglie. Ma questi dieci non sono un regalo: sono
-- dieci mesi di stagione, uno al mese. Un check-in che sopravvive alla
-- stagione che lo comprendeva è una stagione che non finisce mai.
-- ============================================================

-- --- 1. Stato prima ---------------------------------------------------------
--
-- profiles  82af2508-760f-4fae-b509-74c5631e84a4 · Wilma Zulian
--   tier one_to_one · stagione prepagata 2026/27 · tier_expires_at 01/07/2027
--
--   10 token `call` · 0 riscattati · expires_at NULL su tutti e dieci
--
-- --- 2. L'istruzione eseguita ----------------------------------------------
--
-- La scadenza si legge da `tier_expires_at`, non si scrive a mano: così il
-- token e l'abbonamento muoiono lo stesso giorno per costruzione, e se la
-- stagione viene estesa al rinnovo basta rilanciare questa stessa update.
-- Tocca solo i token ancora da spendere: uno già riscattato è storia.

update public.lesson_tokens t
   set expires_at = p.tier_expires_at
  from public.profiles p
 where p.id = t.swimmer_id
   and t.swimmer_id = '82af2508-760f-4fae-b509-74c5631e84a4'
   and t.redeemable_for = 'call'
   and t.redeemed_at is null
   and t.expires_at is null
   and p.tier_expires_at is not null;

-- --- 3. Verifica fatta dopo -------------------------------------------------
--
--   10 token `call` · 10 con scadenza · tutti al 01/07/2027
--   spendibili oggi: 10 — la scadenza è lontana, non toglie niente adesso
--
-- Nel profilo della nuotatrice, sotto i check-in, ora compare «Da usare entro
-- il 1 luglio 2027»: una scadenza che non si legge è una sorpresa.
--
-- Da qui in avanti non serve più questo file: `giftToken` aggancia da sola la
-- scadenza della stagione a ogni check-in che il coach aggiunge.
