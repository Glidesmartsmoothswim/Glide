-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- glide-ext-recesso.md: diritto di recesso al checkout (artt. 52-59 Codice
-- del Consumo). Un consumatore che sottoscrive online ha 14gg di recesso
-- pieno; se il servizio parte subito, serve la rinuncia esplicita PRIMA del
-- pagamento — e la prova va scritta solo dal server, mai da un flag client
-- (stesso principio del consenso Art. 9, ADR-007).
alter table public.subscriptions
  add column withdrawal_waived_at      timestamptz,
  add column withdrawal_waiver_ip_hash text;

comment on column public.subscriptions.withdrawal_waived_at is
  'Timestamp server-side della rinuncia al recesso di 14gg (Art. 59 lett. a Codice del Consumo), valorizzato alla creazione della sessione Stripe Checkout — mai da un flag client.';
comment on column public.subscriptions.withdrawal_waiver_ip_hash is
  'SHA-256 dell''IP del richiedente al momento della rinuncia. Mai l''IP in chiaro.';
