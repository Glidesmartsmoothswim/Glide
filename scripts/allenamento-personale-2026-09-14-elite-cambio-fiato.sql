-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- =====================================================================
-- Scheda personale 1:1 Elite — "Cambio del fiato e aerobico con attrezzi"
-- Prima seduta dei rinnovi 1:1, settimana del 14/09/2026. 2700 m.
--
-- ⏸ NON ANCORA ESEGUITO sul live. A differenza di
--    scripts/allenamento-personale-2026-09-09.sql e degli script del
--    Canale Open, questo file arriva PRIMA dell'insert: è la seduta
--    dettata da Alessio il 14/09/2026, messa in forma per essere letta e
--    approvata. Si lancia solo dopo GO esplicito, e una volta sola per
--    ogni atleta a cui va assegnata.
--
-- 🚫 NON È IDEMPOTENTE: una seconda esecuzione con lo stesso swimmer_id
--    duplica la scheda. Dopo l'esecuzione questo blocco va aggiornato in
--    "✅ GIÀ ESEGUITO il <data>", come negli script precedenti.
--
-- Non è una migration: non va in supabase/migrations/, non tocca lo
-- schema, usa solo colonne esistenti.
--
-- Il repo è pubblico: coach_id e swimmer_id restano placeholder e qui non
-- compare nessun dato personale degli atleti. Prima di lanciare:
--    \set coach_id   '00000000-0000-0000-0000-000000000000'
--    \set swimmer_id '00000000-0000-0000-0000-000000000000'
-- Per ritrovarli:
--    select id, email, role from public.profiles where role = 'coach';
--    select id, email from public.profiles
--     where role = 'swimmer' and tier = 'one_to_one';
--
-- "I rinnovi" sono più di un atleta, ma la riga è una per swimmer_id
-- (public.workouts.swimmer_id non è una lista): la seduta è la stessa per
-- tutti, l'insert va ripetuto cambiando \set swimmer_id. Le note tecniche
-- sono scritte al singolare perché è così che le legge l'atleta.
-- =====================================================================


-- ---------------------------------------------------------------------
-- L'IMPIANTO — dettato da Alessio, 14/09/2026.
--
-- Due fili, uno tecnico e uno di carico:
--   • CAMBIO DEL FIATO. Il lato di respirazione non è una preferenza da
--     assecondare: si alterna nel riscaldamento, e nel blocco con le
--     pinne decide da quale bracciata si esce dalla subacquea (sempre
--     quella opposta al lato su cui si respira).
--   • AEROBICO GESTITO CON GLI ATTREZZI. I 1500 m di serie aerobica
--     scendono per gradi di assistenza: 500 a corpo libero, 500 con le
--     pinne, 500 con pinne + palette + boccaglio. Lo stimolo resta Z2, a
--     cambiare è quanto l'attrezzo tiene su l'assetto mentre la tecnica
--     regge.
--
--   Blocco 1 (Z1, 3 giri)   riscaldamento, 400 m/giro       1200 m
--     2x50 pinne + 4x25 di esercizi + 100 misto + 2x50 braccia.
--   Blocco 2 (Z2, 1 giro)   5x100 a corpo libero             500 m
--   Blocco 3 (Z2, 1 giro)   2x250 stile con pinne            500 m
--   Blocco 4 (Z2, 1 giro)   500 pinne, palette e boccaglio   500 m
--                                                          -------
--                                                           2700 m
--
-- La serie aerobica è dichiarata "più o meno sui 500 m" a blocco: i tre
-- blocchi sono tenuti tutti a 500 esatti, così il totale è un numero
-- tondo e la scalatura futura si fa a blocchi interi.
--
-- FOCUS = 'Z2'. La seduta non ha un set sopra soglia: il blocco che la
-- caratterizza è l'aerobico. mainZone() sui blocchi restituisce Z2, e la
-- colonna focus dice la stessa cosa — coerenza che sul Canale Open era
-- mancata (focus vuoto su una seduta dichiaratamente Z5, corretto a mano
-- il 13/09).
--
-- RECUPERI SCRITTI IN LETTERE, non con la notazione @. Sui 5x100 il
-- recupero è "20 secondi" e non `20"`: parseLine (src/lib/workout.ts)
-- legge `20"` come INTERVALLO di partenza, e siccome quel blocco è il set
-- principale della seduta finirebbe in mainSetSig() come "100 SL @20" Z2",
-- cioè una prescrizione che non esiste. Scritto a parole resta una nota e
-- la firma del set principale resta pulita. I metri non cambiano in nessuno
-- dei due casi.
--
-- Nota di lettura sul parser: su due righe parseLine marca mode='gambe'
-- solo perché la parola "gambe" compare nella descrizione (i 4x25 del
-- riscaldamento e il 500 finale). Non è un errore da correggere: il campo
-- `mode` non è usato in rendering — workout-card.tsx stampa la riga com'è e
-- colora solo la zona — e i metri non ne dipendono.
--
-- SCALATURA — scale_down/scale_up restano null: sono una funzione del
-- Canale Open, dove l'allenamento è uno per tutti. In 1:1 il carico è già
-- scritto per l'atleta (stessa scelta di allenamento-personale-2026-09-09).
--
-- week_day null: il giorno lo sceglie l'atleta. week_start = '2026-09-14',
-- il lunedì corrente (src/lib/week.ts, currentMonday).
-- ---------------------------------------------------------------------

insert into public.workouts
  (coach_id, swimmer_id, kind, title, focus, pool, week_day, week_start,
   total_meters, blocks, scale_down, scale_up, published_at)
values
(
  :'coach_id',
  :'swimmer_id',
  'personal',
  'Cambio del fiato e aerobico con attrezzi',
  'Z2',
  25,
  null,
  '2026-09-14',
  2700,
  $b$[
    {
      "z": "Z1",
      "name": "Riscaldamento",
      "rounds": 3,
      "lines": [
        "2x50 SL pinne — ben nuotati",
        "4x25 pinne — cambio del fiato · gambe delfino sul dorso · solo braccio destro con gambe delfino · solo braccio sinistro con gambe delfino",
        "100 MX — cambio ogni 25",
        "2x50 braccia pull — 25 remate + 25 ben nuotati"
      ],
      "note": "Tre giri da 400, sempre uguali: 1200 m per arrivare alla serie aerobica già caldo e già in assetto, non per fare metri.\n\nI 4x25 con le pinne sono il cuore del riscaldamento. Sul primo 25 si cambia il lato di respirazione, non si nuota sul lato comodo. Sul secondo le gambe delfino sul dorso tengono i fianchi alti. Sugli ultimi due si nuota con un braccio solo, prima il destro e poi il sinistro, gambe delfino: il braccio fermo resta lungo davanti, la rotazione la fa il tronco.\n\nSui 2x50 a braccia con il pull: 25 di remate per sentire l'appoggio dell'avambraccio, 25 nuotati bene. Le remate non sono velocità, sono ricerca dell'acqua."
    },
    {
      "z": "Z2",
      "name": "Aerobico — 5x100 a corpo libero",
      "rounds": 1,
      "lines": [
        "5x100 SL — recupero stretto 20 secondi · senza attrezzi · Z2"
      ],
      "note": "Senza attrezzi, apposta: qui non c'è niente che tenga su l'assetto al posto tuo.\n\nSi lavora sul recupero della bracciata: gomito alto e mano bassa, rilassata, che passa vicino all'acqua. Occhio soprattutto al braccio sinistro, dove il carico tende a salire sulla spalla invece di restare sul gomito.\n\nRecupero stretto, 20 secondi: serve a tenere il ritmo, non a recuperare del tutto."
    },
    {
      "z": "Z2",
      "name": "Aerobico — 2x250 stile con pinne",
      "rounds": 1,
      "lines": [
        "2x250 SL pinne — subacquea a ogni spinta dal muro · Z2"
      ],
      "note": "Subacquea tutte le volte che si spinge sul muro. Assetto buono, tre colpi di gambe sotto, poi si esce.\n\nL'uscita è sempre con la bracciata del braccio opposto al lato su cui si respira: se respiro a sinistra esco con la bracciata destra, se respiro a destra esco con la sinistra. L'obiettivo è che l'uscita sia fluida, non che sia lunga.\n\nLa virata può essere a capriola o toccando il muro e ripartendo, non è quello il punto: il punto è concentrarsi sulla virata invece di subirla."
    },
    {
      "z": "Z2",
      "name": "Aerobico — 500 pinne, palette e boccaglio",
      "rounds": 1,
      "lines": [
        "500 SL pinne palette boccaglio — lento, ben nuotato, gambe continue · Z2"
      ],
      "note": "Si continua a lavorare sul recupero delle braccia: mani rilassate e gomito alto, come sui 5x100, ma qui con le palette che rendono tutto più evidente.\n\nIl boccaglio è l'attrezzo chiave del blocco: togliendo la respirazione laterale, si resta ben ruotati e ben impostati per tutti i 500, senza il momento in cui si perde l'assetto per andare a prendere aria.\n\nVoglio un 500 lento, ben nuotato, con le gambe continue. Non è un test: è il modo di chiudere la seduta nuotando bene mentre si è stanchi."
    }
  ]$b$::jsonb,
  null,
  null,
  now()
);


-- ---------------------------------------------------------------------
-- VERIFICA — attesa una riga per ogni swimmer_id su cui si è lanciato
-- l'insert: 2700 m, focus Z2, week_day null, pubblicata.
--
-- Se total_meters non torna, il conto è questo, e va rifatto riga per riga
-- con parseLine (src/lib/workout.ts):
--   blocco 1 → (100 + 100 + 100 + 100) x 3 giri = 1200
--   blocco 2 → 5x100                            =  500
--   blocco 3 → 2x250                            =  500
--   blocco 4 → 500                              =  500
--                                                 ----
--                                                 2700
-- ---------------------------------------------------------------------

select title, focus, week_day, total_meters, published_at is not null as pubblicato
from public.workouts
where kind = 'personal'
  and swimmer_id = :'swimmer_id'
  and week_start = '2026-09-14'
order by created_at;
