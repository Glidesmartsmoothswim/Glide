-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- =====================================================================
-- PROMPT_CODE_ALLENAMENTI_OPEN — storico di cosa è stato eseguito.
--
-- ✅ GIÀ ESEGUITO INTERAMENTE il 07/09/2026, sul progetto live, con GO
--    esplicito di Alessio in sessione ("fai tutto tu"). Ordine effettivo:
--    PARTE 1 (migration) → PARTE 2 (seed) → merge PR #58 → deploy.
--
-- 🚫 NON RILANCIARE questo file. La PARTE 1 è idempotente
--    (add column if not exists), la PARTE 2 NON lo è: duplicherebbe i due
--    allenamenti del Canale Open.
--
-- Questo NON è un file in supabase/migrations/: è uno script manuale,
-- come scripts/rls-audit.sql. La migration è registrata su Supabase come
-- `workouts_scale_down_up`.
--
-- Perché l'ordine contava: le server action (saveOpenWorkout /
-- savePersonalWorkout / updateWorkout) scrivono scale_down/scale_up a ogni
-- salvataggio — senza le colonne, l'insert sarebbe fallito.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PARTE 1 — TASK 1: colonne di scalatura suggerita.
--
-- RLS: le policy su public.workouts sono tutte a livello di RIGA (nessuna
-- elenca colonne), quindi le colonne nuove ereditano l'accesso esistente.
-- Verificato leggendo pg_policies il 07/09/2026, non assunto. Per
-- ricontrollarlo:
--   select policyname, cmd, qual, with_check
--   from pg_policies where schemaname='public' and tablename='workouts';
-- ---------------------------------------------------------------------

alter table public.workouts
  add column if not exists scale_down text,
  add column if not exists scale_up   text;

comment on column public.workouts.scale_down is
  'Indicazione scritta dal coach per rendere la seduta piu leggera. Non modifica i blocchi.';
comment on column public.workouts.scale_up is
  'Indicazione scritta dal coach per rendere la seduta piu impegnativa. Non modifica i blocchi.';


-- ---------------------------------------------------------------------
-- PARTE 2 — TASK 6: seed dei due allenamenti del Canale Open.
--
-- Entrambi pubblicati subito (published_at = now()): visibili agli atleti
-- all'istante. week_day = null (TASK 5). pool = 25 per compatibilità col
-- renderer, ma i testi sono deliberatamente vasca-agnostici.
--
-- 🚫 GIÀ ESEGUITA il 07/09/2026 — NON rilanciarla. Non è idempotente:
--    duplicherebbe i due allenamenti. Resta qui come traccia.
--
-- Il coach_id è un placeholder (:'coach_id'): il repo è pubblico. Per
-- rieseguire questo blocco su un altro ambiente, impostalo prima —
--    \set coach_id '00000000-0000-0000-0000-000000000000'
-- oppure sostituisci a mano le due occorrenze. Per ritrovarlo:
--    select id, email from public.profiles where role = 'coach';
-- ---------------------------------------------------------------------

insert into public.workouts
  (coach_id, kind, title, focus, pool, week_day, week_start, total_meters, blocks, scale_down, scale_up, published_at)
values
(
  :'coach_id',
  'open_channel',
  'Velocità — Virate aperte',
  'NM',
  25,
  null,
  '2026-09-07',
  2200,
  '[
    {
      "z": "Z1",
      "name": "Riscaldamento",
      "rounds": 1,
      "lines": [
        "200 SL pinne",
        "4x50 MX frazionato 12,5 per stile",
        "3x100 Pull palette (50 afferrate / 50 indossate)"
      ],
      "note": "Sul Pull, focus sul gomito alto in fase subacquea."
    },
    {
      "z": "NM",
      "name": "Virate",
      "rounds": 4,
      "lines": [
        "2x50 virata a vuoto a 12,5",
        "4x25 partenza 12,5, progressione lieve al muro, virata",
        "2x50 25 forte con virata a vuoto a 12,5 + 25 di recupero",
        "Recuperi personali."
      ],
      "note": "VIRATA A VUOTO — rotazione sul posto senza appoggio dei piedi, corpo in streamline verso il lato opposto, poi si riprende la direzione di avanzamento. Se il muro c''è, la virata si fa reale: sono 50 con virata a 12,5.\n\nROUND 1-2, virata stoppata sui 4x25. Dopo la rotazione ci si ferma 3\" con i piedi al muro e si controlla: piedi separati, fianchi in linea o leggermente sotto, spalle in linea con i fianchi, braccia già in streamline verso la direzione di ripartenza. Poi spinta, scivolamento pieno, chiusura tranquilla fino a 12,5.\n\nROUND 3-4, virata scivolata sui 4x25. Niente stop: appena i piedi toccano si spinge via cercando lo scivolamento più lungo e veloce possibile in streamline, poi 12,5 piano.\n\nSull''ultimo 2x50 conta solo la prima virata, quella forte. Il secondo 25 è recupero e non si valuta."
    },
    {
      "z": "Z1",
      "name": "Defaticamento",
      "rounds": 1,
      "lines": ["6x50 pinne, solo esercizi, stile a piacere"]
    }
  ]'::jsonb,
  'Blocco virate: 2 round invece di 4.',
  'Blocco virate: 5 round invece di 4.',
  now()
),
(
  :'coach_id',
  'open_channel',
  'Recupero — Piramide decrescente',
  'Z2',
  25,
  null,
  '2026-09-07',
  3200,
  '[
    {
      "z": "Z1",
      "name": "Riscaldamento",
      "rounds": 2,
      "lines": [
        "100 SL pinne",
        "2x50 gambe laterali con tavola",
        "2x100 braccia — 1° round: pull + palette afferrate + boccaglio / 2° round: solo pull"
      ],
      "note": "GAMBE LATERALI — mano aperta in completo appoggio sopra la tavola, al centro. Corpo sul fianco, testa appoggiata sulla spalla. In alternativa si può usare un pull buoy al posto della tavola, tenendo presente che il galleggiamento sarà diverso. Se il lato risulta difficile da tenere, si può cambiare lato a metà vasca con qualche bracciata di raccordo.\n\nBRACCIA — cercare subito una presa profonda. In attacco, posizionare la mano in basso più che accelerare: si deve sentire la bracciata piena. In recupero, mano vicina al busto, gomito e spalla molto alti."
    },
    {
      "z": "Z2",
      "name": "Piramide decrescente",
      "rounds": 1,
      "lines": [
        "800 pinne + palette — andata ogni 3, ritorno pari (2 o 4, a scelta)",
        "r.30\"",
        "600 solo pinne — rotazione, spinta al muro, 3 gambate subacquee obbligate",
        "r.20\"",
        "400 solo palette — bracciata ampia, distesa, gomito alto",
        "r.15\"",
        "200 completo"
      ],
      "note": "USCITA DAL MURO — mai respirare sulla prima bracciata. Al massimo alla seconda, o al primo ciclo completo: se respiro a destra il primo movimento è della mano sinistra, e viceversa.\n\nSul 400 vale lo stesso focus del riscaldamento sull''ampiezza. Il 200 finale è nuotato, senza focus particolari."
    },
    {
      "z": "Z1",
      "name": "Defaticamento",
      "rounds": 1,
      "lines": [
        "8x50 pinne, alternati:",
        "25 gambe + 25 esercizi",
        "25 esercizi + 25 completo"
      ],
      "note": "Sul completo, poche bracciate ma fluide e fatte bene."
    }
  ]'::jsonb,
  'Piramide: togli 100 m a ogni distanza (700-500-300-100).',
  'Piramide: aggiungi 100 m a ogni distanza (900-700-500-300).',
  now()
);


-- ---------------------------------------------------------------------
-- PARTE 3 — verifica.
-- Attesi 3 record pubblicati: 'Approccio alla soglia', 'Velocità — Virate
-- aperte', 'Recupero — Piramide decrescente'. I due nuovi con week_day null.
-- ---------------------------------------------------------------------

select title, focus, week_day, total_meters, published_at is not null as pubblicato
from public.workouts
where kind = 'open_channel' and week_start = '2026-09-07';
