-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- =====================================================================
-- Scheda personale 1:1 — "Tecnica e attrezzi — seduta breve"
-- Settimana del 14/09/2026. 1900 m.
--
-- ✅ GIÀ ESEGUITO il 14/09/2026 sul progetto live, con GO esplicito di
--    Alessio in sessione. Una riga, pubblicata subito, 1900 m,
--    week_start 2026-09-14. Testo verificato contro il database con
--    l'impronta md5 di zone, nomi, giri, righe e note dei quattro blocchi:
--    e56b3fcfeda7343c7305eb0b19e22ebb, identica a quella calcolata su
--    questo file.
--
--    LA SEDUTA È UN REGALO a un'atleta che NON ha il percorso 1:1: è
--    `tier = 'free'` con una richiesta di 1:1 stagionale in attesa di
--    pagamento. Questo ha una conseguenza da conoscere prima di rifarlo
--    per qualcun altro: src/app/app/nuoto/page.tsx gata le schede personali
--    con `personalAccess = tier === 'one_to_one'`, quindi per lei la query
--    non parte e LA SCHEDA NON COMPARE nella pagina Nuoto. La RLS invece
--    la concede (`swimmer_id = auth.uid()`, migration_050) e
--    /app/nuoto/[id] non ha gate di tier: la riga si apre al link diretto,
--    che è il modo in cui le è stata consegnata. Le alternative — togliere
--    il gate di tier, o alzarle il tier a one_to_one — sono state scartate
--    in sessione: la prima è una modifica di prodotto che vale per tutti
--    (il gate è una decisione esplicita, PROMPT_CODE_PAGAMENTI TASK 6), la
--    seconda regalerebbe l'intero percorso 1:1 non pagato, lo scivolone
--    già costato l'Elite da 646 € del 12/09 (vedi lib/payment/pricing.ts).
--
-- 🚫 NON RILANCIARE: l'insert NON è idempotente, duplicherebbe la scheda.
--    Questo file resta come traccia di cosa è stato scritto, come
--    scripts/allenamento-personale-2026-09-09.sql.
--
-- Non è una migration: non va in supabase/migrations/, non tocca lo
-- schema, usa solo colonne esistenti.
--
-- L'ATLETA NON È NOMINATA QUI, né nel titolo né nelle note. Il repo è
-- pubblico, e il nome di una persona insieme alla sua seduta e a un
-- problema di schiena è un dato personale: resta fuori, come in tutti gli
-- script precedenti di scripts/. L'atleta è individuata solo da
-- \set swimmer_id al momento dell'esecuzione. Prima di lanciare:
--    \set coach_id   '00000000-0000-0000-0000-000000000000'
--    \set swimmer_id '00000000-0000-0000-0000-000000000000'
-- Per ritrovarli:
--    select id, email, role from public.profiles where role = 'coach';
--    select id, email from public.profiles where role = 'swimmer';
-- =====================================================================


-- ---------------------------------------------------------------------
-- L'IMPIANTO — dettato da Alessio, 14/09/2026.
--
-- Seduta corta e tutta di tecnica: nessun set a intensità, nessun
-- cronometro. Il carico sta negli attrezzi e nel controllo, non nel passo.
--
--   Blocco 1 (Z1, 2 giri)  riscaldamento, 150 m/giro         300 m
--     50 stile completo + 50 stile esercizi + 50 dorso doppio.
--   Blocco 2 (Z2, 1 giro)  12x50 braccia con gli attrezzi     600 m
--     6 pull + palette (afferrate / normali, alternati)
--     6 pull + boccaglio (25 a pugni + 25 completo).
--   Blocco 3 (Z1, 1 giro)  12x50 misti con le pinne           600 m
--     3 per stile: delfino, dorso e stile con le pinne, rana senza.
--   Blocco 4 (Z1, 1 giro)  4x100 pinne e palette              400 m
--                                                            -------
--                                                             1900 m
--
-- ⚠️ METRI DA CONFERMARE. In sede di dettatura, dopo i primi tre blocchi,
--    il conto detto a voce era "dovremmo essere già a 1400". I tre blocchi
--    come sono descritti fanno 1500 (300 + 600 + 600), e ciascuno dei tre
--    è internamente coerente: il riscaldamento è dichiarato di 300 m e il
--    giro da 3x50 ripetuto due volte fa 300; "i primi sei / i secondi sei"
--    fa 12x50 = 600; "tre per ogni stile" sui quattro stili fa 12x50 = 600.
--    Quindi qui è scritto 1500, e il totale è 1900: è il valore andato nel
--    database. Se l'intenzione era davvero 1400 (e quindi 1800), a cambiare
--    è uno dei tre blocchi, e va detto quale — 100 m non si tolgono da soli
--    senza rompere un conto che torna. La correzione a posteriori è una
--    riga sola, sul modello degli update annotati in
--    scripts/allenamenti-open-2026-09-14.sql:
--       update public.workouts set total_meters = 1800
--       where kind = 'personal' and id = '<id della scheda>';
--    ma va fatta insieme al blocco che cala, non da sola.
--
-- LA SCHIENA. Il terzo 50 di ogni stile nel blocco dei misti è a scelta
-- dell'atleta — altri esercizi, oppure completo a bracciate ridotte —
-- secondo come sta la schiena quel giorno. È una prescrizione, non una
-- concessione, e sta scritta nella nota del blocco perché la decisione la
-- prende lei in vasca, non il foglio.
--
-- FOCUS = 'Tecnica · Z2'. La seduta è di tecnica, e il blocco che la
-- caratterizza per densità di lavoro continuo sono i 12x50 a braccia:
-- mainZone() sui blocchi restituisce Z2, e la seconda metà del focus dice
-- la stessa cosa. Stessa coerenza focus/zona tenuta nell'altra scheda del
-- 14/09, nella forma composita già usata sul Canale Open ('Tecnica · NM').
--
-- SCALATURA — scale_down/scale_up restano null: sono una funzione del
-- Canale Open. In 1:1 il carico è già scritto per l'atleta.
--
-- week_day null: il giorno lo sceglie l'atleta. week_start = '2026-09-14'.
-- ---------------------------------------------------------------------

insert into public.workouts
  (coach_id, swimmer_id, kind, title, focus, pool, week_day, week_start,
   total_meters, blocks, scale_down, scale_up, published_at)
values
(
  :'coach_id',
  :'swimmer_id',
  'personal',
  'Tecnica e attrezzi — seduta breve',
  'Tecnica · Z2',
  25,
  null,
  '2026-09-14',
  1900,
  $b$[
    {
      "z": "Z1",
      "name": "Riscaldamento",
      "rounds": 2,
      "lines": [
        "50 SL completo",
        "50 SL esercizi",
        "50 DS doppio"
      ],
      "note": "Due giri uguali da 150. Il 50 di stile completo apre e basta, senza cercare niente.\n\nSul 50 di esercizi scegli tu quali, purché siano di sensibilità e non di forza. Il 50 di dorso doppio chiude il giro: braccia simultanee, senza fretta, serve ad aprire le spalle prima del lavoro con gli attrezzi."
    },
    {
      "z": "Z2",
      "name": "Braccia con gli attrezzi",
      "rounds": 1,
      "lines": [
        "6x50 braccia pull palette — alternati: 1 con le palette afferrate, 1 con le palette normali",
        "6x50 braccia pull boccaglio — 25 a pugni chiusi + 25 completo"
      ],
      "note": "PALETTE — Palette afferrate vuol dire che poggiano sull'avambraccio con la mano chiusa attorno alla parte bassa, senza infilare le dita: così la presa dell'acqua la deve trovare l'avambraccio e non il palmo. Si alterna un 50 afferrate e un 50 con le palette messe normalmente, per sentire la differenza subito dopo.\n\nPUGNI — Sui secondi sei si cambia attrezzo: via le palette, pull e boccaglio. Il 25 a pugni chiusi toglie la mano dall'equazione e obbliga l'avambraccio a lavorare; il 25 completo che segue serve a ritrovare la stessa sensazione con la mano aperta. Il boccaglio tiene la testa ferma per tutti e 600 i metri: qui non si respira di lato, si nuota e basta."
    },
    {
      "z": "Z1",
      "name": "Misti con le pinne",
      "rounds": 1,
      "lines": [
        "9x50 MX pinne — 3 delfino, 3 dorso, 3 stile",
        "3x50 RA — senza attrezzi"
      ],
      "note": "Via gli attrezzi del blocco prima, si mettono le pinne. Tre 50 per ogni stile, nell'ordine: delfino, dorso, stile con le pinne, e per ultima la rana, che si nuota dopo aver tolto le pinne.\n\nLa terna è sempre la stessa: il primo 50 di gambe, il secondo di esercizi, il terzo LO SCEGLI TU — o altri esercizi, o un 50 completo cercando di farlo con meno bracciate possibile. La scelta dipende da come sta la schiena quel giorno: se tira, resta sugli esercizi e non andare a cercare l'allungo."
    },
    {
      "z": "Z1",
      "name": "Sciolto lungo",
      "rounds": 1,
      "lines": [
        "4x100 SL pinne palette — piano, ben nuotate, lunghe e distese"
      ],
      "note": "Ultimo lavoro, e si chiude. Pinne e palette, piano piano: non è un set, è il modo di uscire dall'acqua nuotando bene.\n\nBella lunga e distesa: poche bracciate, nessuna fretta di chiudere il 100."
    }
  ]$b$::jsonb,
  null,
  null,
  now()
);


-- ---------------------------------------------------------------------
-- VERIFICA — attesa una riga: 1900 m, focus 'Tecnica · Z2', week_day null,
-- pubblicata.
--
-- Il conto, riga per riga con parseLine (src/lib/workout.ts):
--   blocco 1 → (50 + 50 + 50) x 2 giri = 300
--   blocco 2 → 6x50 + 6x50             = 600
--   blocco 3 → 9x50 + 3x50             = 600
--   blocco 4 → 4x100                   = 400
--                                        ----
--                                        1900
-- ---------------------------------------------------------------------

select title, focus, week_day, total_meters, published_at is not null as pubblicato
from public.workouts
where kind = 'personal'
  and swimmer_id = :'swimmer_id'
  and week_start = '2026-09-14'
order by created_at;
