-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- GLIDE — incasso del pacchetto 10 lezioni di Flavia Berti Lorenzi
-- (ADR-016, saldo in contanti di sabato 12/09/2026)
--
-- APPLICATO sul progetto live il 13/09/2026 (MCP), con data d'incasso
-- 12/09/2026 confermata da Alessio. Tenuto qui perché una correzione
-- contabile deve restare leggibile e ripetibile, non vivere solo nella
-- cronologia di una sessione.
--
-- Il fatto: l'11/09/2026 il pacchetto è stato assegnato PRIMA dell'incasso
-- (token emessi a mano, `tokens_issued_at` valorizzato apposta perché il
-- trigger non li riemettesse). La riga è quindi rimasta `status = 'paid'`
-- con `paid_at` nullo: per Business — che legge l'incasso da `paid_at`,
-- non dallo stato — quei 270€ erano ancora da incassare, e il ricavo non
-- esisteva in `transactions`.
--
-- I contanti sono stati consegnati sabato 12/09/2026. Questo script scrive
-- i due fatti mancanti: la data d'incasso sull'ordine e la riga di ricavo.
-- Non tocca i token: sono già in mano alla nuotatrice dall'11/09.
--
-- Tutte le operazioni sono IDEMPOTENTI: rieseguire non raddoppia nulla.
-- ============================================================

begin;

-- --- 1. La data d'incasso sull'ordine ----------------------------------
-- `paid_at` è il fatto contabile: prima di questa riga non c'era, quindi
-- l'ordine risultava (correttamente) fra le voci scoperte.
update public.package_purchases
set paid_at = '2026-09-12 12:00:00+00'::timestamptz
where id = '45280a9f-ca38-4676-8aa0-c6e4e34aa913'
  and paid_at is null;

-- --- 2. Il ricavo nei Ricavi -------------------------------------------
-- Business e la soglia forfettario leggono SOLO `transactions`: senza
-- questa riga un pacchetto incassato non comparirebbe mai fra i ricavi.
insert into public.transactions
  (swimmer_id, type, amount_cents, currency, status, description, created_at)
select pp.swimmer_id, 'package', pp.amount_cents, 'eur', 'succeeded',
       'Pacchetto ' || pp.quantity || ' lezioni — contanti, incasso del 12/09/2026',
       '2026-09-12 12:00:00+00'::timestamptz
from public.package_purchases pp
where pp.id = '45280a9f-ca38-4676-8aa0-c6e4e34aa913'
  and not exists (
    select 1 from public.transactions t
    where t.swimmer_id = pp.swimmer_id
      and t.type = 'package'
      and t.created_at::date = date '2026-09-12'
  );

commit;

-- --- Verifica (eseguita il 13/09/2026) ----------------------------------
-- paid_at = 12/09/2026 12:00 UTC, tokens_issued_at intatto all'11/09, una
-- sola riga di ricavo da 270€ datata 12/09, 10 token di cui 7 disponibili
-- (05/09, 12/09 e 19/09 già prenotate a token). "Da incassare" è sceso a
-- 467,50€: il piano stagione di Wilma Zulian, bonifico non ancora
-- ricevuto — quello resta scoperto davvero.
--
--   select status, paid_at, tokens_issued_at from public.package_purchases
--   where id = '45280a9f-ca38-4676-8aa0-c6e4e34aa913';
--
--   select type, amount_cents, created_at, description
--   from public.transactions where type = 'package';
