-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- GLIDE — migration_063_profilo_di_test.sql
-- PROMPT_CODE_GATING A5 — i profili di prova non sono clienti.
--
-- Finché non si distinguono inquinano ogni conteggio gestionale: "quanti
-- iscritti ho", i segmenti di /coach/nuotatori, il digest del lunedì.
--
-- Marcatura, non cancellazione. Una colonna esplicita costa poco e non perde
-- niente; il committente ha chiesto di CONSERVARE il profilo di Chiara C.
-- Per Matteo B (da rimuovere) qui non si cancella nulla: l'inventario dei
-- record collegati sta nel resoconto, e la rimozione resta una decisione sua.
--
-- `is_test` non cambia permessi né accessi: serve a non contarlo, non a
-- limitarlo. Un profilo di prova deve poter fare tutto ciò che fa un cliente,
-- altrimenti non prova niente.
-- ============================================================

alter table public.profiles
  add column if not exists is_test boolean not null default false;

comment on column public.profiles.is_test is
  'Profilo di prova, non un cliente. Va ESCLUSO dai conteggi gestionali e '
  'mostrato come tale nelle viste coach. Non cambia permessi né accessi.';

create index if not exists profiles_is_test_idx on public.profiles (is_test) where is_test;

-- Chiara Caccamo — profilo di test, da conservare (committente, 13/09/2026).
update public.profiles
   set is_test = true
 where id = 'cf8b8175-9253-461d-8f91-91191e7cc4b4';

-- Quando la vista di coerenza fra i due assi (docs/GLIDE_MIGRAZIONE_TIER.md,
-- fase 2) verrà applicata dovrà escludere i profili di test: Chiara è free
-- con service_type 'both', e continuerebbe a segnalare un'incoerenza voluta.
