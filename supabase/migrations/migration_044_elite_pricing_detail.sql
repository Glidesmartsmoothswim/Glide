-- ============================================================
-- GLIDE — migration_044_elite_pricing_detail.sql
--
-- GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md (28/08/2026) — il prezzo 1:1 Elite
-- è calcolato da un questionario (allenamenti/sett + cadenza/canale
-- check-in), non più un valore fisso per riga di TIER_PRICE_CENTS. Il
-- coach deve poter vedere COSA è stato richiesto quando conferma
-- l'incasso (payment_amount_cents da solo non lo dice più).
--
-- Colonna nullable, puramente descrittiva: MAI usata per calcolare nulla
-- lato server (il prezzo resta ricalcolato server-side da
-- lib/payment/elite-pricing.ts sulla selezione, mai fidandosi di questo
-- testo) — solo per mostrarla al coach in "Segna pagato" e nella
-- notifica/email di richiesta.
-- ============================================================

alter table public.profiles
  add column if not exists requested_tier_detail text;

comment on column public.profiles.requested_tier_detail is
  'ADR-014 + GLIDE_HANDOFF_PREZZI_FATTURAZIONE: descrizione leggibile della configurazione richiesta (es. 1:1 Elite con questionario allenamenti/cadenza/canale). Solo display, mai usata per calcoli.';
