-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================================
-- PROPOSTA — NON ESEGUITA, NON UNA MIGRAZIONE.
--
-- Risposta a GLIDE_AUDIT_COERENZA.md §8 · A4. Il ragionamento, i numeri e le
-- decisioni aperte stanno in docs/GLIDE_MIGRAZIONE_TIER.md: leggi quello prima.
--
-- Questo file sta FUORI da supabase/migrations/ di proposito: non deve poter
-- finire in produzione per errore. Quando le fasi sono approvate, le si copia
-- in supabase/migrations/migration_059_... con il numero progressivo giusto.
--
-- Nessuna istruzione qui sotto cancella dati o colonne. Non ci sono DROP TABLE,
-- DROP COLUMN, DELETE, UPDATE, TRUNCATE.
-- ============================================================================


-- ============================================================================
-- FASE 1 — Dichiarare legacy `subscriptions` (rischio zero, reversibile)
-- ============================================================================
-- Verificato il 13/09/2026 in produzione: 0 righe, nessuna FK entrante, nessuna
-- vista, funzione o policy che la nomini, nessun `.from("subscriptions")` in
-- src/. RLS attiva con una sola policy di SELECT: nessuna scrittura possibile
-- oltre la service_role.

comment on table public.subscriptions is
  'LEGACY (Stripe, pre ADR-014). NON USARE. Vocabolario tier open/open_water/'
  'elite mai allineato al resto del sistema; 0 righe al 13/09/2026. '
  'L''abbonamento vive su profiles.tier + profiles.payment_status '
  '(migration_043). Le colonne withdrawal_* sono superate dal flusso manuale '
  'di ADR-014. Da valutare per la cancellazione a stagione contabile chiusa, '
  'e solo dopo riverifica del conteggio righe.';

comment on column public.subscriptions.tier is
  'LEGACY. open/open_water/elite: vocabolario che non esiste altrove, né nel '
  'sito né nel prototipo. Il livello autorevole è profiles.tier.';

-- Blocco esplicito della scrittura. Oggi è già impossibile (nessuna policy di
-- scrittura), ma questo la rende impossibile anche se qualcuno aggiungesse una
-- policy senza leggere il commento qui sopra.
revoke insert, update, delete on public.subscriptions from authenticated;
revoke insert, update, delete on public.subscriptions from anon;

-- Stesso trattamento per l'altra tabella orfana dello stesso capitolo.
comment on table public.stripe_events is
  'LEGACY (Stripe, pre ADR-014). NON USARE. 0 righe al 13/09/2026.';
revoke insert, update, delete on public.stripe_events from authenticated;
revoke insert, update, delete on public.stripe_events from anon;


-- ============================================================================
-- FASE 2 — Scrivere i due assi nello schema (rischio zero)
-- ============================================================================

-- --- Asse A: livello di accesso. Autorevole. ---------------------------------
comment on column public.profiles.tier is
  'ASSE A — livello di accesso. free|open|open_plus|one_to_one. AUTOREVOLE: '
  'unica sorgente del gating, letto da public.my_tier() nelle RLS e da '
  'ACCESS_MATRIX in src/lib/access.ts. Etichette utente in TIER_LABEL: '
  'Base|Open|Open+|1:1, le stesse di sito e prototipo.';

comment on column public.library_items.visibility is
  'ASSE A — stesso vocabolario di profiles.tier. Livello minimo che sblocca '
  'il contenuto (src/lib/access.ts, canOpenLibraryItem).';

-- --- Asse B: tipo di servizio. NON è un livello. -----------------------------
comment on column public.profiles.service_type is
  'ASSE B — tipo di servizio, etichetta operativa messa dal coach. '
  'coaching_1_1|open|both. NON è il livello di accesso: un profilo può avere '
  'service_type coaching_1_1 e tier free (13/09/2026: due profili in questo '
  'stato). Per decidere un accesso si usa SEMPRE l''asse A via accessTier().';

comment on column public.plan_entitlements.tier is
  'ASSE B, NOME FUORVIANTE: contiene un profiles.service_type, non un tier. '
  'Da rinominare in service_type (fase 3 di docs/GLIDE_MIGRAZIONE_TIER.md). '
  'Letta da src/lib/booking/credits.ts per concedere i crediti lezione: un '
  'service_type incoerente col tier NEGA una prestazione già pagata (accaduto '
  'il 12/09/2026, scripts/ricavi-correzioni-2026-09-12.sql §2). '
  'ATTENZIONE: remote_allowed qui vale true per il service_type 1:1 anche '
  'senza pagamento — non usarlo da solo per autorizzare, passa da '
  'canBookRemote() che incrocia l''asse A e il gate di pagamento.';

comment on column public.race_videos.tier is
  'ASSE B, NOME FUORVIANTE, e mai letta: coaching_1_1|open scritti da '
  'src/app/app/video/actions.ts e videoanalisi-actions.ts, non interrogati da '
  'nessuna query, vista o policy. La decisione vive in `paid` e `status`. '
  'Fase 4 di docs/GLIDE_MIGRAZIONE_TIER.md: deprecare, rinominare o tenere.';

comment on column public.events.audience is
  'ASSE B — elenco di profiles.service_type ammessi, non di tier. Letta da '
  'src/app/app/prenota/page.tsx e src/app/api/events/signup/route.ts (dove la '
  'variabile locale si chiama `tier` ma contiene service_type).';

-- --- Asse C: SKU commerciale. Distinto di proposito. -------------------------
comment on column public.profiles.requested_tier is
  'ASSE C — SKU richiesto all''attivazione. open|open_plus|'
  'one_to_one_monthly|one_to_one_season. Due listini (mensile, stagionale) '
  'aprono lo stesso livello di accesso one_to_one dell''asse A: la '
  'differenza è di prezzo, non di permessi. Non va allineato all''asse A.';

-- --- Il check che manca sull'asse B ------------------------------------------
-- profiles.service_type è oggi un text libero con default 'open': niente in DB
-- impedisce di scriverci 'elite'. I 18 valori presenti soddisfano già il check
-- (verificato), quindi l'aggiunta non fallisce e non tocca dati.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_service_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_service_type_check
      check (service_type in ('coaching_1_1','open','both'));
  end if;
end $$;

-- --- Vista di sorveglianza: dove i due assi non si parlano -------------------
-- Non corregge niente: mette in evidenza. La correzione di un profilo è una
-- decisione del coach, da prendere dall'interfaccia, perché cambia accesso e
-- gate di pagamento di una persona reale.
--
-- Non è sorveglianza preventiva di un rischio ipotetico: il 12/09/2026 un
-- profilo con tier one_to_one e service_type 'open' si è visto negare il
-- check-in compreso nel piano e fatturare 35€ di lezione extra
-- (scripts/ricavi-correzioni-2026-09-12.sql §2). Il primo ramo del CASE qui
-- sotto è esattamente quella forma: la vista l'avrebbe mostrata prima che
-- diventasse una richiesta di pagamento sbagliata.
create or replace view public.v_tier_coherence as
select
  p.id,
  p.tier            as asse_a_livello,
  p.service_type    as asse_b_servizio,
  p.requested_tier  as asse_c_sku,
  p.payment_status,
  case
    when p.tier = 'one_to_one'
     and p.service_type not in ('coaching_1_1','both')
      then 'livello 1:1 senza servizio 1:1'
    when p.tier in ('free','open','open_plus')
     and p.service_type in ('coaching_1_1','both')
      then 'servizio 1:1 senza livello 1:1 — entitlement remoto non dovuto'
  end as anomalia
from public.profiles p
where p.role = 'swimmer'
  and (
    (p.tier = 'one_to_one' and p.service_type not in ('coaching_1_1','both'))
    or
    (p.tier in ('free','open','open_plus')
     and p.service_type in ('coaching_1_1','both'))
  );

comment on view public.v_tier_coherence is
  'Profili in cui asse A (tier) e asse B (service_type) non si parlano. '
  'Diagnostica, non correzione. Al 13/09/2026 restituisce 2 righe.';

alter view public.v_tier_coherence set (security_invoker = true);

revoke all on public.v_tier_coherence from public, anon;
grant select on public.v_tier_coherence to authenticated;


-- ============================================================================
-- FASE 3 — Rinominare le colonne che mentono (RICHIEDE CAMBIO DI CODICE)
-- ============================================================================
-- NON eseguire da sola: il rename non perde dati e non riscrive la tabella, ma
-- rompe subito i quattro punti di codice elencati qui sotto. Da deployare in
-- una finestra unica, DDL e codice insieme (opzione 3a, raccomandata).
--
--   src/lib/booking/credits.ts:79    .eq("tier", serviceType)  → "service_type"
--   src/lib/booking/credits.ts:18    tipo Entitlement, campo `tier`
--   src/app/app/video/actions.ts:176 insert di race_videos.tier
--   src/app/coach/agenda/videoanalisi-actions.ts:310  idem
--
-- alter table public.plan_entitlements rename column tier to service_type;
-- alter table public.race_videos       rename column tier to service_type;


-- ============================================================================
-- FASE 4 — race_videos.tier (RICHIEDE UNA DECISIONE)
-- ============================================================================
-- Opzione 1, raccomandata: deprecare. Smettere di scriverla nei due insert,
-- togliere il NOT NULL, tenere le 10 righe esistenti come storia. Non c'è
-- niente da migrare perché nessuno la legge.
--
-- alter table public.race_videos alter column tier drop not null;
--
-- Opzione 2: rinominarla (fase 3) e darle un lettore vero, altrimenti è lo
-- stesso dato inutile con un nome migliore.
--
-- Opzione 3: lasciarla. Sconsigliata: è la trappola che l'audit segnala.
