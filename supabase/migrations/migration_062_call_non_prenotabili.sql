-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- GLIDE — migration_062_call_non_prenotabili.sql
-- PROMPT_CODE_GATING A4.2 — le call tecniche non si prenotano.
--
-- `call_60` (40 €) e `call_30` (25 €) sono oggi active=true e compaiono fra i
-- servizi prenotabili. Non devono: una videocall singola si attiva per
-- intervento del coach, oppure è compresa nel coaching a distanza. Non è un
-- prodotto che si compra da solo.
--
-- NIENTE DA PROTEGGERE. Verificato prima di disattivarle: nessuna
-- prenotazione esiste su questi due servizi. Le due transazioni da 25 € in
-- archivio sono lezioni in vasca da 60 minuti a prezzo affiliato, non call —
-- il codice del servizio non c'entra.
--
-- `active=false` e non `delete`: il prezzo resta leggibile per la storia
-- contabile, e riattivarle è una riga se il committente cambia idea.
-- ============================================================

update public.services
   set active = false
 where code in ('call_30', 'call_60');
