-- =====================================================================
-- Scheda personale 1:1 — "Simmetria — dorso e stile"
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
-- L'IMPIANTO — perché è fatto così.
--
-- È il gemello della seduta di lunedì ("Simmetria — delfino e rana",
-- 2500 m, svolta martedì sera, RPE 6, umore 4, nessuna modifica ai blocchi):
-- stesso scheletro, stesso volume, stessi due blocchi da 2 giri, stessa
-- meccanica del "1° giro / 2° giro". Cambiano solo i due stili al centro:
-- lì delfino e rana, qui dorso e stile.
--
--   Blocco 1 (Z1, 2 giri × 500 m) — riscaldamento, la riga dei 4x50 si
--   sdoppia: 1° giro tutto dorso, 2° giro tutto stile.
--   Blocco 2 (Z2, 2 giri × 750 m) — braccia costante, i 6x25 si sdoppiano
--   (dorso / stile), 4x100 di recupero a chiudere.
--
-- Il volume resta 2500 m di proposito: la seduta di lunedì è stata
-- assorbita bene (RPE 6 su una Z2), quindi il carico non si muove — si
-- muove lo stimolo tecnico. Le due sedute insieme coprono i quattro stili
-- nell'arco della settimana.
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
  'Simmetria — dorso e stile',
  'Z2',
  25,
  null,
  '2026-09-07',
  2500,
  '[
    {
      "z": "Z1",
      "name": "Riscaldamento",
      "rounds": 2,
      "lines": [
        "200 SL pinne",
        "100 MX cambio 25",
        "4x50 — 1° giro pinne: 25 gambe DS braccia lungo i fianchi + 25 DS a un braccio solo / 2° giro: 25 gambe SL sul fianco + 25 SL completo"
      ],
      "note": "GIRO 1 — sulle gambe dorso tieni le braccia lungo i fianchi e ruota le spalle: la rotazione parte dal tronco, non dal collo. La testa resta ferma, gli occhi al soffitto. Sul 25 a un braccio solo usa la prima volta il destro, la seconda il sinistro: il braccio fermo resta disteso sopra la testa e non si muove finché l''altro non ha chiuso.\n\nGIRO 2 — sulle gambe stile sul fianco stai lungo, spalla bassa dentro l''acqua, una linea sola dalla mano al piede. Cambia lato a metà vasca. Sul 25 di stile completo cerca la bracciata più lunga possibile: conta le bracciate e tienile uguali su tutte e quattro le ripetute."
    },
    {
      "z": "Z2",
      "name": "Braccia, dorso e recupero",
      "rounds": 2,
      "lines": [
        "4x50 braccia pull — 25 remate sul dorso + 25 DS a braccia opposte",
        "6x25 pinne — 1° giro DS gambe continue (1 volta 15 m subacquei, 1 volta 25 m) / 2° giro SL a bracciate minime",
        "4x100 recupero r.15-20\" — 1° giro 50 DS + 50 SL / 2° giro SL"
      ],
      "note": "Sulle remate sul dorso avambraccio alto e mano che spinge verso i piedi, corpo sempre in streamline. Sul 25 di dorso a braccia opposte non fermarti nel punto di passaggio: le braccia restano una all''opposto dell''altra, gambe continue.\n\nSui 6x25 il dorso è piano, morbido, ben nuotato: senza fretta, fatto bene. Nel secondo giro sono tutti a stile, con meno bracciate possibili su ogni 25.\n\nSui 4x100 pensa solo a nuotare bene: bello disteso, gambe continue e braccia lente. Nel primo giro i 50 di dorso servono a scaricare le spalle dopo il pull, non a fare passo."
    }
  ]'::jsonb,
  'Blocco 2: un solo giro invece di due (1750 m totali).',
  'Blocco 2: 6x100 invece di 4x100 nel secondo giro (2700 m totali).',
  now()
);


-- ---------------------------------------------------------------------
-- VERIFICA — attese due schede personali sulla settimana del 07/09/2026:
-- "Simmetria — delfino e rana" e "Simmetria — dorso e stile", 2500 m
-- ciascuna. Se total_meters non torna 2500, il parser (src/lib/workout.ts,
-- parseLine) sta leggendo una riga diversa da come è stata contata qui.
-- ---------------------------------------------------------------------

select title, focus, week_day, total_meters, published_at is not null as pubblicato
from public.workouts
where kind = 'personal'
  and swimmer_id = :'swimmer_id'
  and week_start = '2026-09-07'
order by created_at;
