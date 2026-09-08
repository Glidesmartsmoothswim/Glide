-- ============================================================
-- GLIDE — migration_057_app_config_iban_private.sql (ADR-018)
--
-- L'IBAN del coach non è pubblico. La policy di lettura su `app_config` era:
--
--   "app_config: lettura"  SELECT  to public  using (true)
--
-- `public` include `anon`, e la chiave anon è pubblica nel bundle del
-- browser: chiunque, senza nemmeno registrarsi, poteva leggere
-- `payment_iban` e `payment_intestatario` con una chiamata REST. Era una
-- scelta deliberata (il commento in `lib/payment/bank.ts` la motivava come
-- "secondo punto di verifica indipendente dall'email", anti-phishing), ma
-- il prezzo — il dato personale del coach leggibile dal mondo — è più alto
-- del beneficio, e la decisione è cambiata: le coordinate viaggiano solo
-- per email, a un destinatario noto (ADR-018).
--
-- Le altre chiavi restano leggibili come prima: `payment_grace_days` la
-- legge `derivePaymentGate` a ogni richiesta, dal client RLS del nuotatore.
-- Restringere tutta la tabella romperebbe il gate ad accesso.
--
-- Il coach continua a leggerle: sono i suoi dati, e /coach/stato dice se
-- sono configurate (senza mostrarne il valore). Gli invii email passano dal
-- client service_role, che non è soggetto a RLS.
-- ============================================================

drop policy if exists "app_config: lettura" on public.app_config;

create policy "app_config: lettura" on public.app_config
  for select to public
  using (
    key not in ('payment_iban', 'payment_intestatario')
    or public.is_coach()
  );

comment on table public.app_config is
  'Configurazione chiave-valore. ADR-018: payment_iban/payment_intestatario sono leggibili SOLO dal coach e dal service_role — mai da anon né da un nuotatore autenticato. Le coordinate di incasso escono dal sistema solo via email (lib/payment/transfer-email.ts).';
