-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- =====================================================================
-- ALLENAMENTI CANALE OPEN — settimana del 14/09/2026 (3 sedute).
--
-- ✅ GIÀ ESEGUITO il 13/09/2026 sul progetto live, con GO di Alessio in
--    sessione. Testi scritti da Alessio nel builder; qui sono trascritti
--    alla lettera, non riscritti.
--
-- 🚫 NON RILANCIARE: l'insert NON è idempotente, duplicherebbe le tre
--    sedute. Questo file resta come traccia di cosa è stato scritto,
--    come scripts/allenamenti-open-2026-09-07.sql. Non è una migration:
--    non va in supabase/migrations/, non tocca lo schema.
--
-- Due scelte decise in sessione, diverse da come il builder aveva
-- generato l'SQL:
--
--  • week_start = 2026-09-14, non 2026-09-07. Il 13/09 era l'ultimo
--    giorno della settimana del 7: src/app/app/nuoto/page.tsx filtra il
--    Canale Open su `week_start = currentMonday()`, quindi sulla
--    settimana del 7 le tre sedute sarebbero rimaste visibili agli
--    atleti per poche ore e poi sparite dall'elenco corrente.
--
--  • published_at = now(), non null. published_at NON è un flag di
--    bozza: la query lato atleta non lo guarda, e le righe sarebbero
--    state visibili comunque. Incide sull'ordinamento nella pagina
--    coach e sulla base della finestra di modifica di 14 giorni
--    (src/lib/config.ts), quindi vale la coerenza con saveOpenWorkout,
--    che scrive sempre la data di pubblicazione.
--
-- Il coach_id è un placeholder (:'coach_id'): il repo è pubblico. Per
-- rieseguire su un altro ambiente impostalo prima —
--    \set coach_id '00000000-0000-0000-0000-000000000000'
-- Per ritrovarlo:
--    select id, email from public.profiles where role = 'coach';
-- =====================================================================

insert into public.workouts
  (coach_id, swimmer_id, kind, title, focus, pool, week_day, week_start,
   total_meters, scale_down, scale_up, published_at, blocks)
values
  (:'coach_id', null, 'open_channel', 'Approccio al passo gara', null, 25, null, '2026-09-14', 2900, '-1 giro blocco 2', '+ 1 giro blocco 2', now(),
   $b$[{"z":"Z1","name":"Riscaldamento","lines":["100 Pinne Stile","100 Misti cambio 25","4x50 Pull 25 remate 25 ben nuotati","3x50 15 metri di gambe forti in superficie + 3 cicli veloci"],"rounds":2},{"z":"Z5","name":"Approccio al passo gara","lines":["20x25 Passo (4 Passo 1 recupero - 3 Passo 2 Recupero - 2 Passo 3 recupero - 1 Passo 4 Recupero Lavorando sul numero di bracciate e sul ritmo di gara per il proprio obbiettivo . Recuperi: Passo 100 e 200  40\" Passo 400+ 25\"","100 Sciolto con Pinne Z1"],"rounds":2},{"z":"Z2","name":"Defaticamento","lines":["12x50 Pinne 3x Stile 1x Dorso recupero 15\""],"rounds":1}]$b$::jsonb),
  (:'coach_id', null, 'open_channel', 'Fondo Specifico', 'Z2', 25, null, '2026-09-14', 3500, null, null, now(),
   $b$[{"z":"Z1","name":"Riscaldamento","lines":["200 Pinne 50 Stile 50 Dorso 50 Stile esercizi 500 Dorso Doppio","6x50 Misti cambio 25 (Df Do / Do Ra / Ra Sl)","3x100 Pinne 50 Gambe laterale 50 Struscio le dita in acqua gomito alto nel recupero","6x50 Braccia Pull e Palette 4x PAlette AFFERATE (poggiano su avambraccio, mano chiusa attorno alla parte in basso) 2x solo Pull"],"rounds":1},{"z":"Z2","name":"Distanze Lunghe","lines":["3x800 1° 4x200 Completi 2° 2x400 Pinne con 3 colpi di gambe sub e prima bracciata lato opposto alla respirazione 3° 800 Pinne Palette e Boccaglio nuotando ampi e con poche bracciate"],"rounds":1}]$b$::jsonb),
  (:'coach_id', null, 'open_channel', 'Velocità e Tecnica Fondamentali', 'Tecnica · NM', 25, null, '2026-09-14', 2200, '- 1 serie Blocco centrale', '+ 1 serie blocco centrale', now(),
   $b$[{"z":"Z1","name":"Riscaldamento","lines":["100 Stile con pinne","2x50 Pinne & Boccaglio 25 gambe delfino braccia lungo i fianchi 25 stile ben nuotato","100 Misto","100 Pull 25 Pugni Stile 25 Remate Proprio stile 50 Stile completo (opzione di esercitazione sul 3° 25 con un esercizio di sensibilità - dita separate oppure OK)"],"rounds":2},{"z":"NM","name":"Nuovo blocco","lines":["50 Pinne facendo subacquea lunga a cacciavite ogni spinta dal muro","2x25 Pinne SOLO Subacquea prolungata FORTE","2x25 Sub + 2 cicli in uscita proprio stile (obbiettivo Subacquea Lunga MA: si esce dall'acqua quando si è VELOCI)","100 Sciolto a piacere"],"rounds":4},{"z":"Z2","name":"Defaticamento","lines":["8x50 Completi 1 25 Gambe 25 Esercizi 1 25 Completo 25 Esercizi"],"rounds":1}]$b$::jsonb);


-- ---------------------------------------------------------------------
-- Verifica. Attese 3 righe pubblicate sulla settimana del 14/09, tutte
-- con week_day null (il Canale Open non ha più il giorno fisso).
-- ---------------------------------------------------------------------

select title, focus, week_day, total_meters, published_at is not null as pubblicato
from public.workouts
where kind = 'open_channel' and week_start = '2026-09-14'
order by title;
