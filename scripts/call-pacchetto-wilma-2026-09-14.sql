-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- Traccia dell'emissione eseguita sul live il 14/09/2026.
-- «Wilma, che ha l'abbonamento con call, non può prenotarle. Non sono servizi
-- utilizzabili singolarmente, ma per chi ha quel tipo di pacchetto devono
-- essere previsti. 10 token per le call a lei.»
--
-- Lo schema che rende possibile questa riga è migration_064; qui c'è solo
-- l'emissione per una persona, come per le altre correzioni sui dati.
-- ============================================================

-- --- 1. Perché non le vedeva ------------------------------------------------
--
-- profiles  82af2508-760f-4fae-b509-74c5631e84a4
--   Wilma Zulian · tier one_to_one · service_type coaching_1_1
--   pacchetto: «3 allenamenti/sett + check-in 1 volta al mese (remoto, call)
--   — stagione prepagata (10 mesi, -15%). Upgrade check-in da bimestrale a
--   mensile in omaggio, stesso importo.»
--   saldata il 14/09/2026, tier_expires_at 01/07/2027.
--
-- Il gating per tier era già giusto: plan_entitlements.remote_allowed = true
-- per coaching_1_1, e canBookRemote la lasciava passare. A fermarla era
-- `services.active = false` su call_30 e call_60, messo da migration_062 per
-- impedire che le call si comprassero a sé. Una porta chiusa a chiave per
-- tutti, compresa chi le aveva già pagate.

-- --- 2. I dieci check-in ----------------------------------------------------
--
-- Dieci come i mesi della stagione prepagata, uno al mese. Tipo `call`: non
-- possono pagare un'ora in vasca, e le lezioni non possono pagare una call.
-- Nessuna scadenza (expires_at null, come ogni token regalato dal coach): sono
-- già pagati, e un check-in non fatto a novembre resta suo. Se invece devono
-- morire con la stagione, è una update su expires_at.

insert into public.lesson_tokens (swimmer_id, source, redeemable_for, expires_at, note)
select '82af2508-760f-4fae-b509-74c5631e84a4', 'coach', 'call', null,
       'Check-in mensile da remoto compreso nella stagione prepagata 2026/27 (10 mesi).'
from generate_series(1, 10);

-- --- 3. Verifica fatta dopo -------------------------------------------------
--
--   lesson_tokens di Wilma     10 call · 10 disponibili · 0 lezione
--   services call_30/call_60   active = true (migration_064)
--   disponibilità remota       lun 18:30–20:00, mar 18:30–21:00,
--                              mer 18:30–20:00, gio 18:30–21:00
--
-- Quindi in «Prenota» ora le compaiono le due call, con gli slot di quelle
-- fasce, e il saldo dice «Check-in compreso nel percorso · te ne restano 10».
-- Nessun altro nuotatore ha token `call`: per tutti gli altri le due voci
-- restano invisibili, che è il punto di migration_062 rimasto intatto.
