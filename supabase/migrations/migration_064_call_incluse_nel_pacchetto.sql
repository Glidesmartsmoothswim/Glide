-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- GLIDE — migration_064_call_incluse_nel_pacchetto.sql
-- Le call tornano prenotabili, ma solo dentro il pacchetto che le prevede.
--
-- migration_062 le aveva spente con `active=false` perché «non è un prodotto
-- che si compra da solo», e chiudeva dicendo che riattivarle sarebbe stata una
-- riga «se il committente cambia idea». Non ha cambiato idea: la regola è la
-- stessa, mancava la seconda metà. Chi ha in abbonamento il check-in mensile
-- da remoto oggi non lo può prenotare — per lui la call non è un acquisto, è
-- una prestazione già pagata.
--
-- `active=false` era una porta chiusa a chiave per tutti. Il posto giusto per
-- la regola è il saldo: nasce il token `call`, e la call si prenota spendendo
-- quello e nient'altro. Niente credito lezione, niente contante, niente
-- bonifico — il lato applicativo è in /api/booking/create (isCall) e in
-- prenota/page.tsx, che la mostra solo a chi ne ha uno da spendere.
-- ============================================================

-- --- 1. Il token call --------------------------------------------------------
--
-- Un tipo a sé, non `private_lesson`: un check-in da remoto non deve poter
-- pagare un'ora in vasca, né il contrario. reserve_lesson_token filtra già per
-- `redeemable_for = p_type` (migration_045), quindi la separazione è gratis.

alter table public.lesson_tokens
  drop constraint if exists lesson_tokens_redeemable_for_check;

alter table public.lesson_tokens
  add constraint lesson_tokens_redeemable_for_check
  check (redeemable_for = ANY (ARRAY['private_lesson'::text, 'group_lesson'::text, 'call'::text]));

-- --- 2. I servizi tornano in elenco -----------------------------------------
--
-- Il prezzo resta quello che era (25 € / 40 €): serve alla storia contabile e
-- a un eventuale ritorno alla vendita singola, ma oggi non lo paga nessuno —
-- chi prenota una call sta spendendo un token, e chi non ha token non vede il
-- servizio.

update public.services
   set active = true
 where code in ('call_30', 'call_60');
