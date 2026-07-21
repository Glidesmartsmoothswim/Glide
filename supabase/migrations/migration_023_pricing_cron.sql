-- ============================================================
-- GLIDE — migration_023_pricing_cron.sql  (Onda 13.5)
-- Scadenza del tier stagionale 1:1 (pagamento one-off 690€, valido fino al
-- 30 giugno della stagione) + job pg_cron giornaliero che riporta a free i
-- tier stagionali scaduti. Gli abbonamenti mensili si gestiscono via webhook.
-- ============================================================

alter table public.profiles
  add column if not exists tier_expires_at timestamptz;

comment on column public.profiles.tier_expires_at is
  'Onda 13.5: scadenza del tier stagionale 1:1 (one-off). NULL per mensili/coach '
  '(gestiti da Stripe/coach). Il job giornaliero riporta a free quando scade.';

create extension if not exists pg_cron;

-- Riporta a free i SOLI tier stagionali scaduti (hanno tier_expires_at valorizzato).
create or replace function public.expire_seasonal_tiers()
returns void language sql security definer set search_path = public as $$
  update public.profiles
     set tier = 'free', tier_expires_at = null
   where tier_expires_at is not null
     and tier_expires_at < now();
$$;
revoke execute on function public.expire_seasonal_tiers() from public;

-- Giornaliero alle 03:10 UTC.
select cron.schedule(
  'expire-seasonal-tiers',
  '10 3 * * *',
  $$ select public.expire_seasonal_tiers(); $$
);
