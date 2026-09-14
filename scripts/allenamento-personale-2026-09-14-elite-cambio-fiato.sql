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
-- L'IMPIANTO — dettato da Alessio, 14/09/2026, e corretto da lui sulla
-- prima stesura (riscaldamento, 5x100, 2x250 e recuperi).
--
-- Due fili, uno tecnico e uno di carico:
--   • CAMBIO DEL FIATO. Il lato di respirazione non è una preferenza da
--     assecondare. Nel riscaldamento si isola il gesto un braccio alla
--     volta, prima il destro e poi il sinistro; sui 2x250 si cambia lato
--     a ogni spinta dal muro, e il lato decide da quale bracciata si esce
--     dalla subacquea (sempre quella opposta al lato su cui si respira).
--   • AEROBICO GESTITO CON GLI ATTREZZI. I 1500 m di serie aerobica
--     scendono per gradi di assistenza: 500 completi a corpo libero, 500
--     con le pinne, 500 con pinne + palette + boccaglio. Lo stimolo resta
--     Z2, a cambiare è quanto l'attrezzo tiene su l'assetto mentre la
--     tecnica regge.
--
--   Blocco 1 (Z1, 3 giri)   riscaldamento, 400 m/giro       1200 m
--     100 pinne + 2x50 di esercizi + 100 misto + 2x50 braccia.
--   Blocco 2 (Z2, 1 giro)   5x100 completi a corpo libero    500 m
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
-- IMPAGINAZIONE DELLE NOTE. Il tipo Block (src/lib/workout.ts) ha UN solo
-- campo `note` per blocco, e workout-card.tsx lo stampa in un unico box
-- con whitespace-pre-line. Dove le indicazioni dettate sono due e distinte
-- — il riscaldamento e i 2x250 — restano due note separate dentro quel
-- campo, ciascuna aperta da un'etichetta in maiuscolo e divisa da una riga
-- vuota. È la stessa forma già usata in allenamento-personale-2026-09-09
-- ("STILE — …" / "DORSO — …"): a bordo vasca si legge il titolo giusto
-- senza rileggere tutto il paragrafo.
--
-- Nota di lettura sul parser: su due righe parseLine ricava un `mode` che
-- non c'entra con il set, perché pesca la parola dalla descrizione —
-- 'braccia' sui 2x50 del riscaldamento (da "braccia stile") e 'gambe' sul
-- 500 finale (da "gambe continue"). Non è un errore da correggere: il campo
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
        "100 SL pinne",
        "2x50 pinne — 25 gambe delfino sul dorso + 25 gambe delfino e braccia stile con un braccio solo: 1° 50 destro, 2° 50 sinistro",
        "100 MX — cambio ogni 25",
        "2x50 braccia pull — 25 remate + 25 ben nuotate"
      ],
      "note": "ESERCIZI — I 2x50 con le pinne sono il cuore del riscaldamento. Sul primo 25 gambe delfino sul dorso: i fianchi restano alti e in linea, la spinta parte dal tronco. Sul secondo 25 si gira sullo stile e si nuota con un braccio solo, sempre gambe delfino: il braccio fermo resta lungo davanti e la rotazione la fa il tronco, non la spalla. Il primo 50 con il destro, il secondo con il sinistro, senza saltare il lato meno comodo.\n\nBRACCIA — Sul 100 misto si cambia stile ogni 25, tranquillo, serve a sciogliere. Sui 2x50 a braccia con il pull: 25 di remate per sentire dove l'avambraccio trova l'acqua, 25 nuotati bene. Le remate non sono velocità, sono ricerca dell'appoggio.\n\nTre giri da 400 sempre uguali: 1200 m per arrivare alla serie aerobica già caldo e già in assetto, non per fare metri."
    },
    {
      "z": "Z2",
      "name": "Aerobico — 5x100 completi a corpo libero",
      "rounds": 1,
      "lines": [
        "5x100 SL completi — recupero 20 secondi · senza attrezzi · Z2"
      ],
      "note": "Completi e senza attrezzi, apposta: qui non c'è niente che tenga su l'assetto al posto tuo.\n\nSi lavora sul recupero della bracciata: gomito alto e mano bassa, rilassata, che passa vicino all'acqua. Occhio soprattutto al braccio sinistro, dove il carico tende a salire sulla spalla invece di restare sul gomito.\n\nRecupero 20 secondi: serve a tenere il ritmo, non a recuperare del tutto."
    },
    {
      "z": "Z2",
      "name": "Aerobico — 2x250 stile con pinne",
      "rounds": 1,
      "lines": [
        "2x250 SL pinne — subacquea e cambio del fiato a ogni spinta dal muro · Z2"
      ],
      "note": "SUBACQUEA — Si fa tutte le volte che si spinge sul muro. Assetto buono, tre colpi di gambe sotto, poi si esce. L'obiettivo è che l'uscita sia fluida, non che sia lunga: la virata può essere a capriola o toccando il muro e ripartendo, non è quello il punto — il punto è concentrarsi sulla virata invece di subirla.\n\nCAMBIO DEL FIATO — A ogni spinta dal muro si cambia il lato di respirazione, e il lato decide l'uscita: si esce sempre con la bracciata del braccio opposto a quello su cui si respira. Se respiro a sinistra esco con la destra, se respiro a destra esco con la sinistra."
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
