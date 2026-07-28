-- ============================================================
-- GLIDE — migration_031_stripe_events.sql  (Security S-1 · C-2 idempotenza)
--
-- La firma del webhook è già verificata (constructEvent su raw body). Manca
-- l'IDEMPOTENZA: Stripe ritenta gli eventi; senza dedup un retry può
-- raddoppiare un abbonamento o uno sblocco "birra". Registriamo ogni event.id
-- prima di processarlo; un duplicato viene ignorato.
-- ============================================================

create table if not exists public.stripe_events (
  id           text primary key,           -- event.id di Stripe
  type         text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
-- Nessuna policy: vi scrive/legge solo la service_role (webhook), che bypassa la RLS.
