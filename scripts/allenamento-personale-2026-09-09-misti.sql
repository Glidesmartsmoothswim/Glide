-- =====================================================================
-- Scheda personale 1:1 — "Misti — neuromuscolare e aerobico"
-- Terza seduta della settimana del 07/09/2026.
--
-- ✅ GIÀ ESEGUITO il 09/09/2026 sul progetto live, con GO esplicito di
--    Alessio in sessione. Riga creata: pubblicata subito, 3000 m,
--    week_start 2026-09-07.
--    Nota: l'insert originale scriveva anche scale_down/scale_up. Sono
--    stati azzerati sul live il 09/09 con un update, perché la scalatura
--    scritta non si applica alle schede 1:1 (vedi SCALATURA più sotto):
--       update public.workouts set scale_down = null, scale_up = null
--       where kind = 'personal' and swimmer_id = :'swimmer_id';
--    Il file qui sotto è già allineato: entrambe null.
--
-- 🚫 NON RILANCIARLO. NON È IDEMPOTENTE: una seconda esecuzione duplica
--    la scheda. Resta qui come traccia di cosa è stato scritto.
--
-- Script manuale, non una migration: non tocca lo schema, usa solo colonne
-- già esistenti. Stessa forma di scripts/allenamenti-open-2026-09-07.sql e
-- di scripts/allenamento-personale-2026-09-09.sql.
--
-- Il repo è pubblico: coach_id e swimmer_id restano placeholder, e qui non
-- compare nessun dato personale dell'atleta. Prima di lanciare:
--    \set coach_id   '00000000-0000-0000-0000-000000000000'
--    \set swimmer_id '00000000-0000-0000-0000-000000000000'
-- =====================================================================


-- ---------------------------------------------------------------------
-- L'IMPIANTO — dettato da Alessio, 09/09/2026.
--
-- Terza seduta della settimana, la più lunga: 3000 m contro i 2500 di
-- lunedì e i 2000 della seconda. Qui ci sono tutti e quattro gli stili.
--
--   Blocco 1 (Z1, 1 giro)   riscaldamento             1100 m
--     6x50 sciolto tecnico + 8x50 misti + 4x100 braccia.
--   Blocco 2 (NM, 1 giro)   dodici da 25               300 m
--     tre per stile: due a bracciate minime, uno in easy speed.
--   Blocco 3 (Z2, 1 giro)   aerobico con misti        1200 m
--     6x100 e 12x50 come dettati, un blocco solo, tutto in Z2.
--   Blocco 4 (Z1, 1 giro)   defaticamento              400 m
--                                                    -------
--                                                     3000 m
--
-- Le due sedute precedenti della settimana hanno lavorato sulla rotazione
-- delle spalle e sulla mano che resta in appoggio: il defaticamento a
-- esercizi liberi chiude richiamando quel focus.
----
-- SCALATURA — le colonne scale_down/scale_up NON si usano sulle schede 1:1
-- (kind='personal'): la scalatura scritta è una funzione del Canale Open,
-- dove l'allenamento è uno per tutti e ognuno lo adatta a sé. In 1:1 il
-- carico è già scritto per questo atleta, quindi entrambe restano null.
-- La stessa logica di scalatura resta valida quando si scrive per l'Open.
--
-- week_day resta null come nelle altre due sedute: l'atleta sceglie il
-- giorno. week_start = '2026-09-07' (stessa settimana).
-- ---------------------------------------------------------------------

insert into public.workouts
  (coach_id, swimmer_id, kind, title, focus, pool, week_day, week_start,
   total_meters, blocks, scale_down, scale_up, published_at)
values
(
  :'coach_id',
  :'swimmer_id',
  'personal',
  'Misti — neuromuscolare e aerobico',
  'Z2 · NM',
  25,
  null,
  '2026-09-07',
  3000,
  '[
    {
      "z": "Z1",
      "name": "Riscaldamento",
      "rounds": 1,
      "lines": [
        "6x50 — alternati: 50 SL completo / 50 SL esercizi",
        "8x50 MX — due per stile",
        "4x100 braccia — 25 a pugni + 25 remate + 50 completo"
      ],
      "note": "SCIOLTO — si alterna un 50 completo e un 50 di esercizi. Gli esercizi sono tre, uno per coppia: striscia della mano in acqua, gomito alto, a pugni.\n\nMISTI — due 50 per ogni stile. Il primo è 25 di gambe e 25 di esercizi, il secondo 25 completo e 25 di esercizi.\n\nBRACCIA — 25 a pugni, 25 di remate, 50 completo. Le remate cambiano stile a ogni 100: delfino, dorso, rana, stile. I pugni sono sempre a stile e anche i 50 finali, tranne nel terzo 100, quello della rana: lì il ritorno è 25 di rana completa col pull e 25 a stile."
    },
    {
      "z": "NM",
      "name": "Dodici da 25",
      "rounds": 1,
      "lines": [
        "12x25 — tre per stile: 2 a bracciate minime + 1 easy speed · NM"
      ],
      "note": "Pinne sui primi nove: delfino, dorso, stile. Sugli ultimi tre, a rana, si tolgono."
    },
    {
      "z": "Z2",
      "name": "Aerobico con misti",
      "rounds": 1,
      "lines": [
        "6x100 completi — 2x SL @1''40\" / 1x MX @1''50\"",
        "12x50 pinne — 2x SL @50\" / 1x SL @1''"
      ]
    },
    {
      "z": "Z1",
      "name": "Defaticamento",
      "rounds": 1,
      "lines": [
        "8x50 esercizi — 4 DS + 4 RA, liberi · Z1"
      ],
      "note": "Esercizi liberi, li scegli tu. Tieni il focus della settimana: rotazione delle spalle e mano che resta in appoggio il più a lungo possibile."
    }
  ]'::jsonb,
  null,
  null,
  now()
);


-- ---------------------------------------------------------------------
-- VERIFICA — attese tre schede personali sulla settimana del 07/09/2026:
-- 2500 m, 2000 m e 3000 m.
-- ---------------------------------------------------------------------

select title, focus, week_day, total_meters, published_at is not null as pubblicato
from public.workouts
where kind = 'personal'
  and swimmer_id = :'swimmer_id'
  and week_start = '2026-09-07'
order by created_at;
