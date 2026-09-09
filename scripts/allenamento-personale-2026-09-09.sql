-- =====================================================================
-- Scheda personale 1:1 — "Alternato — stile e dorso"
-- Seconda seduta della settimana del 07/09/2026.
--
-- ⏳ NON ANCORA ESEGUITO. Serve il GO esplicito di Alessio: l'insert
--    pubblica (published_at = now()) e la scheda diventa visibile
--    all'atleta all'istante.
--
-- 🚫 NON È IDEMPOTENTE. Una seconda esecuzione duplica la scheda.
--
-- Come lo script scripts/allenamenti-open-2026-09-07.sql, questo NON è un
-- file in supabase/migrations/: è uno script manuale. Non tocca lo schema,
-- usa solo colonne già esistenti (scale_down/scale_up incluse, aggiunte il
-- 07/09/2026 dalla PARTE 1 di quello script).
--
-- Il repo è pubblico: coach_id e swimmer_id restano placeholder, e qui non
-- compare nessun dato personale dell'atleta. Prima di lanciare:
--    \set coach_id   '00000000-0000-0000-0000-000000000000'
--    \set swimmer_id '00000000-0000-0000-0000-000000000000'
-- Per ritrovarli:
--    select id, email, role from public.profiles where role = 'coach';
--    select id, email from public.profiles where role = 'swimmer';
-- =====================================================================


-- ---------------------------------------------------------------------
-- L'IMPIANTO — dettato da Alessio, 09/09/2026.
--
-- Lavoro ALTERNATO stile/dorso, gemello della seduta di lunedì
-- ("Simmetria — delfino e rana", 2500 m, svolta martedì sera, RPE 6,
-- blocchi non modificati): stessa meccanica del "1° giro / 2° giro", qui
-- applicata a stile libero e dorso.
--
--   Blocco 1 (Z1, 1 giro)   riscaldamento              500 m
--   Blocco 2 (Z1, 2 giri)   esercitazione 6x50/giro    600 m
--   Blocco 3 (Z2, 2 giri)   alternato 450 m/giro       900 m
--                                                    -------
--                                                     2000 m
--
-- Il filo tecnico è uno solo, ripetuto nei tre blocchi: la rotazione delle
-- spalle non si perde quando entra il braccio, e la mano resta in appoggio
-- il più a lungo possibile. Prima si isola (blocco 2, un braccio alla
-- volta), poi si nuota completo sotto attrezzo (blocco 3).
--
-- 2000 m contro i 2500 di lunedì: la seduta è più corta perché è più densa
-- di tecnica: 1100 m su 2000 sono esercizi a velocità controllata.
--
-- week_day resta null come nella seduta di lunedì: l'atleta sceglie il
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
  'Alternato — stile e dorso',
  'Z2',
  25,
  null,
  '2026-09-07',
  2000,
  '[
    {
      "z": "Z1",
      "name": "Riscaldamento",
      "rounds": 1,
      "lines": [
        "2x150 — 100 SL completo + 50 DS doppio",
        "4x50 MX cambio 12,5"
      ],
      "note": "Il 50 di dorso doppio chiude ogni 150: braccia simultanee, senza fretta, serve solo ad aprire le spalle prima del misto."
    },
    {
      "z": "Z1",
      "name": "Esercitazione — rotazione e appoggio",
      "rounds": 2,
      "lines": [
        "6x50 pinne — 1° giro SL + boccaglio / 2° giro DS · sequenza ×2: 50 solo gambe con rotazione spalle + 50 solo braccio destro + 50 solo braccio sinistro"
      ],
      "note": "GIRO 1, stile — la rotazione delle spalle non si perde quando entra il braccio. La mano entra, prima si allunga in avanti, poi passa sotto a spingere: più tempo resta in appoggio, meglio è. Non anticipare la spinta.\n\nGIRO 2, dorso — stesso schema, stesso principio, due cose in più: i fianchi restano alti e in linea, e la mano resta in acqua il più a lungo possibile. Sul 50 di sole gambe le braccia stanno lungo i fianchi e la rotazione parte dal tronco, non dal collo."
    },
    {
      "z": "Z2",
      "name": "Alternato — stile e dorso",
      "rounds": 2,
      "lines": [
        "4x50 pull + palette — 1° giro SL a braccia + boccaglio / 2° giro DS: 25 dorso completo + 25 dorso doppio",
        "6x25 pinne — 1° giro SL in apnea totale / 2° giro DS · progressione 1→3, poi si ripete",
        "100 sciolti senza attrezzi"
      ],
      "note": "GIRO 1, stile — i 4x50 si nuotano meglio che si può: entrambe le braccia, il boccaglio aiuta a tenere la testa ferma e a pensare solo alla bracciata. Sui 6x25 in apnea totale la progressione è dal primo al terzo, con il terzo a buona intensità — easy speed — ma senza mai respirare. Poi la terna si ripete. I 100 finali sono sciolti, senza attrezzi.\n\nGIRO 2, dorso — sui 4x50 con pull e palette: 25 di dorso completo, 25 di ritorno a dorso doppio. Sui 6x25 con le pinne stessa progressione dal primo al terzo: gambata costante e rotazione delle spalle morbida, mai forzata. Si chiude di nuovo con 100 sciolti."
    }
  ]'::jsonb,
  'Blocco 3: un solo giro invece di due (1550 m totali).',
  'Blocco 3: aggiungi un 100 sciolti e porta i 6x25 a 8x25 in ogni giro (2200 m totali).',
  now()
);


-- ---------------------------------------------------------------------
-- VERIFICA — attese due schede personali sulla settimana del 07/09/2026:
-- "Simmetria — delfino e rana" (2500 m) e "Alternato — stile e dorso"
-- (2000 m). Se total_meters non torna, il parser (src/lib/workout.ts,
-- parseLine) sta leggendo una riga diversa da come è stata contata qui.
-- ---------------------------------------------------------------------

select title, focus, week_day, total_meters, published_at is not null as pubblicato
from public.workouts
where kind = 'personal'
  and swimmer_id = :'swimmer_id'
  and week_start = '2026-09-07'
order by created_at;
