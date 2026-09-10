-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- GLIDE — migration_054_payment_status_coherent.sql
-- (GLIDE_DB_CHANGES_001, blocco M3 — bug attivo, non un allineamento)
--
-- `bookings.payment_method` è stato esteso nel tempo a 'token' e
-- 'bank_transfer', ma il vincolo `cash_needs_status` di migration_011 no:
-- parla ancora solo di 'cash'. Conseguenza: una prenotazione con metodo
-- bonifico e stato 'da_incassare' viene RIFIUTATA dal database (23514) —
-- l'errore che `lib/payment/errors.ts` già sa tradurre a video. Solo il
-- contante può avere uno stato di incasso, e questo contraddice l'impianto
-- dell'incasso manuale (ADR-014/ADR-016): il bonifico è il metodo
-- principale, e senza stato non c'è modo di sapere se è stato incassato.
--
-- Dati sul progetto live al momento della scrittura: 2 righe cash /
-- da_incassare, 3 credit / NULL, 1 token / NULL. Tutte già coerenti con la
-- regola nuova: nessuna riga da bonificare prima dell'ALTER.
--
-- Il nome del vincolo cambia perché la regola non parla più solo di
-- contanti. `payment_status` resta binario e fattuale (da_incassare /
-- incassato): qui si allarga CHI deve averlo, non cosa significa.
--
-- APPLICATA sul progetto live l'08/09/2026 (MCP, `054_payment_status_coherent`),
-- con prova pratica su copia temporanea di `bookings` subito dopo: vedi STATO.md.
-- ============================================================

alter table public.bookings
  drop constraint if exists cash_needs_status;

alter table public.bookings
  add constraint payment_status_coherent check (
    (payment_method in ('cash','bank_transfer') and payment_status is not null)
    or
    (payment_method not in ('cash','bank_transfer') and payment_status is null)
  );

comment on constraint payment_status_coherent on public.bookings is
  'Incasso manuale (ADR-014/016): ogni metodo che si incassa fuori piattaforma — contante e bonifico — deve portare uno stato di cassa; credit/token/free/stripe no. Sostituisce cash_needs_status (migration_011), che ammetteva lo stato al solo contante e rifiutava il bonifico.';
