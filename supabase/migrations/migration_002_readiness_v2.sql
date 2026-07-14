-- ============================================================
-- GLIDE — migration_002_readiness_v2.sql
-- APPLICATA su Supabase (progetto unsdbeliaunhhgnuefyz) il 2026-07-14.
--
-- ADATTAMENTO (FASE 0.6): la tabella `readiness` reale usa `swimmer_id`,
-- non `user_id`. Ho cambiato SOLO i NOMI (user_id -> swimmer_id) in:
--   · indice readiness_sig_idx
--   · viste v_readiness, v_efficiency_points, v_effetto_acqua
-- La LOGICA è invariata. Le colonne di scala (sleep/fatigue/soreness/
-- mood/motivation/rpe/note) combaciavano già.
--
-- Additiva: nessun DROP. Le colonne vecchie (fatigue, soreness) restano
-- deprecate; si eliminano a mano dopo il collaudo (azione distruttiva).
-- ============================================================

-- 1. NUOVE COLONNE — tutte "5 = meglio"
alter table public.readiness
  add column if not exists energia        smallint check (energia between 1 and 5),
  add column if not exists corpo          smallint check (corpo   between 1 and 5),
  add column if not exists umore_post     smallint check (umore_post between 1 and 5),
  add column if not exists pain_sites     text[],
  add column if not exists health_flag    boolean not null default false,
  add column if not exists red_flag       boolean not null default false,
  add column if not exists scales_version smallint not null default 2;

comment on column public.readiness.energia is
  'Ex "fatigue", INVERTITA. 1 = sono a terra, 5 = pieno serbatoio. 5 è sempre meglio.';
comment on column public.readiness.corpo is
  'Ex "soreness", INVERTITA. 1 = dolore forte, 5 = zero dolori. 5 è sempre meglio.';
comment on column public.readiness.umore_post is
  'Umore DOPO la seduta. Stessa scala di mood. Input dell''Effetto Acqua.';
comment on column public.readiness.pain_sites is
  'Sedi del dolore. Obbligatorio se corpo <= 3. MAI copiato in events.';

-- 2. BACKFILL dati esistenti (inversione una tantum)
update public.readiness set energia = 6 - fatigue  where energia is null and fatigue  is not null;
update public.readiness set corpo   = 6 - soreness where corpo   is null and soreness is not null;
update public.readiness set scales_version = 1
 where scales_version = 2 and umore_post is null and fatigue is not null;

-- 3. FIRMA DEL SET PRINCIPALE — confronto a parità di prescrizione
alter table public.readiness add column if not exists main_set_sig text;
create index if not exists readiness_sig_idx
  on public.readiness (swimmer_id, main_set_sig, created_at desc)
  where main_set_sig is not null;

-- 4. BANDE RPE ATTESE PER ZONA — configurabili
create table if not exists public.zone_rpe_bands (
  zone     text primary key check (zone in ('Z1','Z2','Z3','Z4','Z5')),
  rpe_min  smallint not null,
  rpe_max  smallint not null
);
insert into public.zone_rpe_bands (zone, rpe_min, rpe_max) values
  ('Z1',1,3),('Z2',3,5),('Z3',6,7),('Z4',8,9),('Z5',9,10)
on conflict (zone) do nothing;
alter table public.zone_rpe_bands enable row level security;
create policy "bands_read"  on public.zone_rpe_bands for select using (true);
create policy "bands_write" on public.zone_rpe_bands for all
  using (public.is_coach()) with check (public.is_coach());

-- 5. VISTE (security_invoker = true → rispettano la RLS di chi legge)

-- 5a — Readiness scomposta. NON esiste un readiness_totale.
create or replace view public.v_readiness
with (security_invoker = true) as
select
  r.id, r.swimmer_id, r.created_at,
  r.sleep as sonno, r.energia, r.corpo,
  r.mood as umore_pre, r.motivation as motivazione,
  r.rpe, r.umore_post, r.main_set_sig, r.pain_sites, r.health_flag,
  round(((r.sleep + r.energia + r.corpo)::numeric / 3), 2) as readiness_fisica,
  round(((r.mood  + r.motivation)::numeric      / 2), 2)   as readiness_mentale,
  (r.umore_post - r.mood)                                  as effetto_acqua
from public.readiness r;

-- 5b — Punti validi per la Curva di efficienza (filtro fisica >= 3.5).
create or replace view public.v_efficiency_points
with (security_invoker = true) as
select swimmer_id, created_at, main_set_sig, rpe, readiness_fisica
from public.v_readiness
where main_set_sig is not null and rpe is not null and readiness_fisica >= 3.5;

-- 5c — Effetto Acqua aggregato.
create or replace view public.v_effetto_acqua
with (security_invoker = true) as
select
  swimmer_id,
  count(*) as sessioni,
  count(*) filter (where umore_post > umore_pre) as uscito_meglio,
  count(*) filter (where umore_post = umore_pre) as uguale,
  count(*) filter (where umore_post < umore_pre) as uscito_peggio,
  round(avg(effetto_acqua)::numeric, 2) as delta_medio
from public.v_readiness
where umore_post is not null and umore_pre is not null
group by swimmer_id;

-- 6. VINCOLO — sede del dolore obbligatoria se corpo <= 3
alter table public.readiness drop constraint if exists readiness_pain_site_required;
alter table public.readiness
  add constraint readiness_pain_site_required
  check (corpo is null or corpo > 3 or (pain_sites is not null and array_length(pain_sites,1) >= 1));
