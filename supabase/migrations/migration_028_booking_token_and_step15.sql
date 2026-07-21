-- ============================================================
-- GLIDE — migration_028_booking_token_and_step15.sql  (Onda 22)
--
-- 1) BUG: le prenotazioni con TOKEN 1:1 usano payment/payment_method = 'token',
--    ma i CHECK esistenti (migration_005 / _011) non lo prevedevano → il DB
--    rifiutava la prenotazione ("bookings_payment_check"). Aggiungiamo 'token'.
-- 2) Passo slot riportato a 15 minuti. Il "delay" a fine lezione resta 0:
--    services.buffer_min è già 0 (migration_026), quindi si può prenotare
--    subito un'altra lezione senza tempo morto.
-- ============================================================

-- 1) Ammetti lo stato/metodo 'token' sulle prenotazioni ----------------------
alter table public.bookings drop constraint if exists bookings_payment_check;
alter table public.bookings add constraint bookings_payment_check
  check (payment in ('credit','paid','free','pending','token'));

alter table public.bookings drop constraint if exists bookings_payment_method_check;
alter table public.bookings add constraint bookings_payment_method_check
  check (payment_method in ('credit','stripe','cash','free','token'));

-- 2) Passo di 15 minuti sulle regole di disponibilità ------------------------
update public.availability_rules set slot_step = 15 where slot_step <> 15;
