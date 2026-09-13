-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- GLIDE — migration_061_colletta_birra.sql
-- PROMPT_CODE_GATING A4.1 — la Colletta per la Birra è una partita aperta,
-- non un pagamento online.
--
-- COSA SUPERA. Oggi un video di chi non è 1:1 nasce `status='locked'`,
-- `paid=false`: un paywall. Il nuotatore legge "Analisi bloccata", il coach
-- deve "sbloccare" prima di poter lavorare. È ciò che ha costretto, in
-- passato, a creare record fittizi `coaching_1_1` pur di sbloccare a mano.
-- In produzione ci sono 6 video `locked` fermi lì.
--
-- IL MODELLO NUOVO. Il servizio si eroga, l'importo si annota, si incassa col
-- rinnovo successivo. Il video non si blocca mai. Tre stati possibili:
--   'dovuta'  → la colletta è segnata, il video si lavora comunque
--   'pagata'  → incassata; nasce una transazione type='birra'
--   'offerta' → il coach l'ha offerta; nessun importo, nessuna transazione
-- 'offerta' è distinta da 'pagata' di proposito: se fossero la stessa cosa i
-- conti tornerebbero solo per caso, e un omaggio finirebbe nei ricavi.
--
-- PREZZO. 3 €, non più i 5 € di BIRRA_CENTS hardcoded in src/lib/video.ts.
-- Vive in `services` come gli altri importi.
-- ============================================================

-- --- 1. Il listino ospita anche ciò che non si prenota ---------------------
-- `services` era modellata per soli servizi prenotabili: mode in
-- (pool|remote|group) e duration_min in (30|45|60). Una colletta non ha né
-- durata né modalità. Invece di scrivere una durata falsa pur di far entrare
-- la riga, allargo il vocabolario con un modo esplicito: 'listino', voce di
-- prezzo che non si prenota.
alter table public.services drop constraint if exists services_mode_check;
alter table public.services add constraint services_mode_check
  check (mode in ('pool', 'remote', 'group', 'listino'));

alter table public.services drop constraint if exists services_duration_min_check;
alter table public.services add constraint services_duration_min_check
  check (duration_min in (0, 30, 45, 60) and (mode <> 'listino' or duration_min = 0));

comment on column public.services.mode is
  'pool|remote|group = prenotabile. listino = sola voce di prezzo, MAI '
  'prenotabile: ogni query di prenotazione deve escluderla (BOOKABLE_MODES '
  'in src/lib/booking/modes.ts). Aggiunto da migration_061.';

insert into public.services (code, name, mode, duration_min, price_cents, credit_cost, capacity, active, sort)
values ('birra', 'Colletta per la Birra', 'listino', 0, 300, 0, 0, true, 100)
on conflict (code) do update
  set name = excluded.name, mode = excluded.mode, duration_min = excluded.duration_min,
      price_cents = excluded.price_cents, credit_cost = excluded.credit_cost,
      capacity = excluded.capacity, active = excluded.active;

-- --- 2. La partita aperta --------------------------------------------------
create table if not exists public.birra_tab (
  id             uuid primary key default gen_random_uuid(),
  swimmer_id     uuid not null references public.profiles(id) on delete cascade,
  -- Una colletta nasce quasi sempre da un video, ma può stare anche sul solo
  -- profilo: NULL è legittimo. Se il video sparisce la partita resta aperta —
  -- è un credito verso una persona, non verso un file.
  video_id       uuid references public.race_videos(id) on delete set null,
  amount_cents   int  not null default 300 check (amount_cents >= 0),
  state          text not null default 'dovuta'
                 check (state in ('dovuta', 'pagata', 'offerta')),
  opened_at      timestamptz not null default now(),
  settled_at     timestamptz,
  transaction_id uuid references public.transactions(id) on delete set null,
  note           text,
  created_at     timestamptz not null default now(),
  -- Una partita chiusa ha una data di chiusura, una aperta no. Senza questo
  -- vincolo "chiusa senza data" diventa possibile e i conti non si rifanno.
  constraint birra_tab_chiusura_coerente check (
    (state = 'dovuta' and settled_at is null)
    or (state <> 'dovuta' and settled_at is not null)
  ),
  -- Un omaggio non ha una transazione: se ce l'avesse, sarebbe un incasso.
  constraint birra_tab_offerta_senza_incasso check (
    state <> 'offerta' or transaction_id is null
  )
);

create index if not exists birra_tab_aperte_idx
  on public.birra_tab (swimmer_id, opened_at desc) where state = 'dovuta';
create index if not exists birra_tab_video_idx on public.birra_tab (video_id);

alter table public.birra_tab enable row level security;

-- Il coach apre, chiude e offre. Il nuotatore legge la propria partita: è un
-- debito suo, e il prodotto non lo nasconde — ma non lo può toccare.
drop policy if exists "birra: il coach gestisce" on public.birra_tab;
create policy "birra: il coach gestisce" on public.birra_tab
  for all to authenticated
  using (public.is_coach()) with check (public.is_coach());

drop policy if exists "birra: il nuotatore legge la propria" on public.birra_tab;
create policy "birra: il nuotatore legge la propria" on public.birra_tab
  for select to authenticated using (swimmer_id = auth.uid());

comment on table public.birra_tab is
  'Colletta per la Birra: partita aperta per la revisione di un video gara. '
  'Il servizio si eroga SEMPRE — nessun paywall, nessun blocco. L''importo si '
  'annota e si incassa col rinnovo successivo (state=pagata → transazione '
  'type=birra) oppure lo si offre (state=offerta → nessuna transazione).';

-- --- 3. Nessun video resta bloccato in attesa di pagamento -----------------
-- I 6 `locked` esistenti tornano lavorabili. Non è una concessione una
-- tantum: è la fine del paywall. `paid` resta per storia e non gatekeepa più
-- niente — chi decide è `birra_tab`.
update public.race_videos
   set status = 'pending'
 where status = 'locked';

-- E non può tornare: tolgo 'locked' dal vocabolario. Finché resta ammesso,
-- basta una riga di codice dimenticata per rimettere in piedi il paywall che
-- questa migrazione smonta. Va eseguito DOPO l'update qui sopra, altrimenti
-- il vincolo trova le righe ancora bloccate e fallisce.
alter table public.race_videos drop constraint if exists race_videos_status_check;
alter table public.race_videos add constraint race_videos_status_check
  check (status in ('pending', 'reviewed'));

comment on column public.race_videos.status is
  'pending|reviewed. Lo stato ''locked'' è superato da migration_061: il '
  'video non si blocca mai in attesa di pagamento. La colletta vive in '
  'public.birra_tab.';
