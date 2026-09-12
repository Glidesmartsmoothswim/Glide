-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- GLIDE — migration_058_transactions_insert_rls.sql
--
-- IL BUG DEI RICAVI A ZERO (12/09/2026).
--
-- `transactions` ha la RLS attiva e UNA SOLA policy:
--
--   "transazioni: lettura propria o coach"  SELECT  using (swimmer_id = auth.uid() or is_coach())
--
-- Nessuna policy INSERT. In Postgres questo non significa "tutti possono
-- inserire": significa che NESSUNO può, tranne service_role (esente da
-- RLS) e il vecchio webhook Stripe, che girava proprio con quella chiave.
-- Rimosso Stripe (ADR-014), tutti gli incassi passano dalle azioni del
-- coach, che usano il client RLS del coach — non l'admin. Da allora i
-- quattro punti che scrivono un ricavo vengono rifiutati in silenzio:
--
--   1. markPaid            (lib/payment/request.ts)   abbonamenti
--   2. markPurchasePaid    (lib/payment/packages.ts)  pacchetti lezioni
--   3. unlockPaidVideo     (coach/video/actions.ts)   sblocco analisi 5€
--   4. markCollected       (coach/agenda/actions.ts)  non provava nemmeno
--
-- Risultato visibile: `transactions` vuota, quindi Business mostrava
-- "Ricavi totali €0", grafico mensile vuoto e soglia forfettario allo 0%
-- con oltre 1.300€ realmente incassati in stagione.
--
-- Qui si apre l'INSERT al coach (e solo a lui: il nuotatore non scrive
-- mai un ricavo — se potesse, potrebbe dichiarare di aver pagato). UPDATE
-- e DELETE restano senza policy, di proposito: un ricavo registrato non
-- si corregge di nascosto, e la contabilità non deve avere una gomma.
-- ============================================================

-- --- 1. INSERT: solo il coach --------------------------------------------
drop policy if exists "transazioni: inserimento coach" on public.transactions;
create policy "transazioni: inserimento coach" on public.transactions
  for insert to authenticated
  with check ( public.is_coach() );

-- --- 2. Un nuovo tipo: la lezione singola --------------------------------
-- `markCollected` incassa una prenotazione saldata a contante/bonifico
-- (registro di cassa, ADR-010/017). Non è un abbonamento né un pacchetto:
-- senza un tipo proprio finirebbe etichettata "Abbonamento" nei ricavi e
-- gonfierebbe il conteggio degli abbonamenti in `v_monthly_revenue`.
alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions add constraint transactions_type_check
  check ( type in ('subscription', 'birra', 'package', 'lesson') );

-- --- 3. Backfill degli incassi persi ------------------------------------
-- Gli abbonamenti già attivati hanno tutto il necessario su `profiles`
-- (importo, data, tipologia): la riga di ricavo si ricostruisce da lì
-- senza inventare nulla. `created_at` prende `paid_at`, altrimenti il
-- grafico mensile metterebbe un incasso di settembre nel mese in cui
-- gira la migrazione.
--
-- Esclusi di proposito:
--   - `payment_amount_cents = 0` → abbonamenti OMAGGIO, servizio erogato
--     ma nessun denaro incassato;
--   - `paid_at is null` → attivazioni a mano senza data d'incasso
--     accertata (non si inventa una data in contabilità);
--   - chi ha già una riga `subscription` nello stesso giorno → la
--     migrazione è idempotente e non raddoppia i ricavi se rieseguita.
insert into public.transactions (swimmer_id, type, amount_cents, currency, status, description, created_at)
select
  p.id,
  'subscription',
  p.payment_amount_cents,
  'eur',
  'succeeded',
  coalesce(nullif(btrim(p.requested_tier_detail), ''), 'Incasso manuale — ricostruito (migration_058)'),
  p.paid_at
from public.profiles p
where p.role = 'swimmer'
  and p.payment_status = 'paid'
  and p.paid_at is not null
  and coalesce(p.payment_amount_cents, 0) > 0
  and not exists (
    select 1 from public.transactions t
    where t.swimmer_id = p.id
      and t.type = 'subscription'
      and t.created_at::date = p.paid_at::date
  );

-- Pacchetti lezioni già incassati (`paid_at` valorizzato). Chi è stato
-- messo a 'paid' per emettere i token PRIMA di ricevere il denaro ha
-- `paid_at is null` e resta fuori: i token sono credito consegnato, non
-- un ricavo incassato.
insert into public.transactions (swimmer_id, type, amount_cents, currency, status, description, created_at)
select
  pp.swimmer_id,
  'package',
  pp.amount_cents,
  'eur',
  'succeeded',
  'Pacchetto ' || pp.quantity || ' lezioni — ricostruito (migration_058)',
  pp.paid_at
from public.package_purchases pp
where pp.status = 'paid'
  and pp.paid_at is not null
  and coalesce(pp.amount_cents, 0) > 0
  and not exists (
    select 1 from public.transactions t
    where t.swimmer_id = pp.swimmer_id
      and t.type = 'package'
      and t.created_at::date = pp.paid_at::date
  );

-- Prenotazioni già incassate dal registro di cassa (`payment_status =
-- 'incassato'`): prima di questa migrazione `markCollected` non scriveva
-- alcun ricavo, quindi ogni lezione singola saldata è da recuperare.
insert into public.transactions (swimmer_id, type, amount_cents, currency, status, description, created_at)
select
  b.swimmer_id,
  'lesson',
  b.amount_cents,
  'eur',
  'succeeded',
  coalesce(s.name, 'Lezione singola') || ' — ricostruito (migration_058)',
  coalesce(b.paid_at, b.starts_at)
from public.bookings b
left join public.services s on s.id = b.service_id
where b.payment_status = 'incassato'
  and coalesce(b.amount_cents, 0) > 0
  and b.swimmer_id is not null
  and not exists (
    select 1 from public.transactions t
    where t.swimmer_id = b.swimmer_id
      and t.type = 'lesson'
      and t.created_at::date = coalesce(b.paid_at, b.starts_at)::date
  );
