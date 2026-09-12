-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- GLIDE — correzioni ai ricavi di stagione (ADR-019, 12/09/2026)
--
-- APPLICATO sul progetto live il 12/09/2026 (MCP). Tenuto qui perché una
-- correzione contabile deve restare leggibile e ripetibile, non vivere solo
-- nella cronologia di una sessione.
--
-- `migration_058` ricostruisce i ricavi dai dati contabili già presenti.
-- Questo script copre ciò che il backfill NON poteva sapere e che è stato
-- confermato da Alessio: due lezioni vendute fuori dall'app, e un piano
-- attivo con `service_type` incoerente.
--
-- Tutte le operazioni sono IDEMPOTENTI: rieseguire non raddoppia nulla.
-- ============================================================

begin;

-- --- 1. Le due lezioni alle affiliate, 25€, già incassate ---------------
-- Non hanno prenotazione a sistema. Si registra il fatto contabile (chi,
-- quanto, quando) senza inventare un orario o un servizio che nessuno ha
-- mai registrato: in contabilità si scrive ciò che si sa.
-- 25€ è la tariffa del prezzario per i clienti storici
-- (GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md §Extra fuori piano: 25-30€).
insert into public.transactions
  (swimmer_id, type, amount_cents, currency, status, description, created_at)
select v.swimmer_id, 'lesson', 2500, 'eur', 'succeeded', v.descr, v.quando
from (values
  -- Giuliana Testai — 31/08/2026
  ('9b0ec8dd-2cd7-4d59-9814-3f7c36a9b940'::uuid,
   'Lezione singola (affiliata, 25€) — incasso registrato a posteriori',
   '2026-08-31 09:00:00+00'::timestamptz),
  -- Irina Battaglini — 05/09/2026
  ('8d7ecb18-3b0f-4f27-bcd8-fe3c28d9ccc3'::uuid,
   'Lezione singola (affiliata, 25€) — incasso registrato a posteriori',
   '2026-09-05 09:00:00+00'::timestamptz)
) as v(swimmer_id, descr, quando)
where not exists (
  select 1 from public.transactions t
  where t.swimmer_id = v.swimmer_id
    and t.type = 'lesson'
    and t.created_at::date = v.quando::date
);

-- --- 2. Battaglini: service_type incoerente col piano attivo ------------
-- Ha comprato il Pacchetto Stagionale Elite 1:1 3+1/mese (`tier` =
-- one_to_one, 646€ incassati) ma `service_type` era rimasto 'open'.
-- `plan_entitlements` si legge PER service_type, e la riga 'open' concede
-- `lessons_granted = 0`: il motore di prenotazione non le ha mai dato il
-- check-in mensile compreso nel piano. Amadio, stesso piano, è
-- 'coaching_1_1' — questa è la forma corretta.
update public.profiles
set service_type = 'coaching_1_1',
    extra_lesson_price_override_cents = 2500
where id = '8d7ecb18-3b0f-4f27-bcd8-fe3c28d9ccc3'
  and service_type <> 'coaching_1_1';

-- Il credito di settembre che il piano avrebbe dovuto concedere, già
-- consumato dalla lezione del 12/09. Idempotente sull'unique
-- (swimmer_id, period_start, source).
insert into public.lesson_credits
  (swimmer_id, period_start, period_end, granted, used, source, note)
values
  ('8d7ecb18-3b0f-4f27-bcd8-fe3c28d9ccc3', '2026-09-01', '2026-09-30', 1, 1, 'plan',
   'Credito check-in di settembre del Pacchetto Stagionale Elite 3+1/mese, ricostruito il 12/09/2026: il piano era attivo ma service_type era rimasto open, quindi il credito non era mai stato concesso. Consumato dalla lezione del 12/09.')
on conflict (swimmer_id, period_start, source) do nothing;

-- --- 3. La prenotazione del 12/09 non è una vendita ---------------------
-- Conseguenza diretta del punto 2: senza credito, il motore l'ha prezzata
-- come lezione EXTRA a listino (35€ contanti, 'da_incassare'). È una
-- lezione di check-in compresa nel piano: era denaro che non andava
-- chiesto. `payment_status_coherent` (migration_054) pretende che un metodo
-- non manuale abbia stato nullo, quindi i campi si cambiano insieme.
update public.bookings
set payment = 'credit',
    payment_method = 'credit',
    payment_status = null,
    amount_cents = null,
    paid_at = null,
    receipt_number = null
where id = 'aa6af6be-38db-4fc4-986f-e966e4980a21'
  and payment_method <> 'credit';

-- --- Verifica ----------------------------------------------------------
-- Atteso: 1351.90 € di ricavi di stagione (le cinque vendite dichiarate —
-- 25 + 25 + 646 + 646 + 9,90), 0 € di prenotazioni da incassare.
do $$
declare
  stagione numeric;
  prenotazioni numeric;
begin
  select coalesce(sum(amount_cents), 0) / 100.0 into stagione
  from public.transactions
  where status = 'succeeded'
    and created_at >= '2026-07-01' and created_at <= '2027-06-30 23:59:59+00';

  select coalesce(sum(amount_cents), 0) / 100.0 into prenotazioni
  from public.bookings where payment_status = 'da_incassare';

  if stagione <> 1351.90 then
    raise exception 'ADR-019: ricavi di stagione attesi 1351.90 €, trovati % €', stagione;
  end if;
  if prenotazioni <> 0 then
    raise exception 'ADR-019: attese 0 prenotazioni da incassare, trovate % €', prenotazioni;
  end if;
  raise notice 'ADR-019 OK: stagione % € · da incassare (prenotazioni) % €', stagione, prenotazioni;
end $$;

commit;
