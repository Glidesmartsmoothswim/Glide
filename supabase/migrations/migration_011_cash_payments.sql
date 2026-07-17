-- ============================================================
-- GLIDE — migration_011_cash_payments.sql  (glide-ext-pagamenti, ADR-010/011)
--
-- Aggiunge il METODO di pagamento e il registro di cassa al booking.
-- La colonna `payment` esistente resta lo STATO. Non riscrive nulla.
-- `payment_status` ha due soli valori, entrambi contabili: il software
-- traccia, non nasconde (ADR-010 §7).
-- ============================================================

alter table public.bookings
  add column payment_method text not null default 'credit'
    check (payment_method in ('credit','stripe','cash','free')),
  add column payment_status text
    check (payment_status in ('da_incassare','incassato')),
  add column amount_cents   int,
  add column receipt_number text,
  add column paid_at        timestamptz;

-- Integrità: se è contante deve avere uno stato di cassa; altrimenti no.
alter table public.bookings add constraint cash_needs_status check (
  (payment_method = 'cash'  and payment_status is not null) or
  (payment_method <> 'cash' and payment_status is null)
);

-- Backfill del metodo sulle righe esistenti, dedotto dallo stato storico.
update public.bookings set payment_method = case
  when payment = 'credit' then 'credit'
  when payment = 'free'   then 'free'
  else 'stripe'                       -- paid | pending
end;
