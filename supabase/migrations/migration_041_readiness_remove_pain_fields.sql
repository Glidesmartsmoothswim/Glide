-- ============================================================
-- GLIDE — migration_041_readiness_remove_pain_fields.sql
-- ADR-013 (PROPOSTO — vedi docs/GLIDE_ADR.md): rimozione del blocco dolore
-- strutturato dal questionario readiness. `pain_sites`/`corpo` sono dato
-- sanitario ai sensi dell'art. 4(15)/9 GDPR indipendentemente da come
-- l'app li usa (GLIDE_SECURITY_AUDIT_v2.md + DPIA). Il canale per
-- segnalare dolore/sintomi resta la chat o la nota libera: il matcher
-- L1/L2 di ADR-004 (testo libero, invariato) continua a operare lì.
--
-- v3.1 (PROMPT_CODE_READINESS_V3_1.md): aggiunge il drop di `fatigue`/
-- `soreness` — colonne legacy pre-v2 (migration_002), stesso problema di
-- `corpo` sotto un altro nome, mai lette da alcun codice applicativo
-- (verificato: solo un commento in src/lib/readiness.ts le menziona).
--
-- ⚠️ IRREVERSIBILE — droppa colonne con dati reali dentro. Prerequisito:
-- la pulizia dei dati di test (profili/readiness/certificati/video dei
-- tester) va fatta PRIMA o IN PARALLELO, non dopo.
--
-- NON APPLICATA a questo commit: preparata come migration tracciata, in
-- attesa che ADR-013 passi da PROPOSTO ad ACCETTATO e che la pulizia dati
-- tester sia confermata (vedi checklist in PROMPT_CODE_READINESS_V3.md).
--
-- Le viste dipendono da v_readiness in cascata: drop e ricrea in ordine.
-- ============================================================

begin;

-- Il constraint spanna corpo+pain_sites: va giù esplicitamente prima
-- dell'ALTER, non lasciato al CASCADE implicito di DROP COLUMN.
alter table public.readiness
  drop constraint if exists readiness_pain_site_required;

drop view if exists public.v_readiness cascade;

alter table public.readiness
  drop column if exists pain_sites,
  drop column if exists corpo,
  drop column if exists health_flag,
  drop column if exists red_flag,
  drop column if exists fatigue,   -- legacy pre-v2 (migration_002): stesso
  drop column if exists soreness;  -- problema di "corpo", scala dolore sotto altro nome

-- v_readiness — readiness_fisica passa da 3 componenti (sonno+energia+corpo)/3
-- a 2 (sonno+energia)/2 (ADR-013). Soglia 3.5 in v_efficiency_points INVARIATA
-- nella formula: ora misura solo sonno/energia, non più corpo (da ricalibrare
-- se l'uso reale lo suggerisce — non in questo task).
create view public.v_readiness
with (security_invoker = true) as
select
  id,
  swimmer_id,
  created_at,
  sleep as sonno,
  energia,
  mood as umore_pre,
  motivation as motivazione,
  rpe,
  umore_post,
  main_set_sig,
  round((sleep + energia)::numeric / 2, 2) as readiness_fisica,
  round((mood + motivation)::numeric / 2, 2) as readiness_mentale,
  umore_post - mood as effetto_acqua,
  note as nota,
  workout_id
from public.readiness r;

create view public.v_effetto_acqua
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

create view public.v_efficiency_points
with (security_invoker = true) as
select swimmer_id, created_at, main_set_sig, rpe, readiness_fisica
from public.v_readiness
where main_set_sig is not null
  and rpe is not null
  and readiness_fisica >= 3.5
  and created_at >= (now() - interval '56 days');

commit;

-- ============================================================
-- Verifica POST-APPLY (obbligatoria prima di considerare il task concluso):
--
--   select * from v_readiness limit 1;
--   select * from v_effetto_acqua limit 1;
--   select * from v_efficiency_points limit 1;
-- Nessuna deve dare errore.
--
--   select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public'
--     and table_name in ('v_readiness', 'v_effetto_acqua', 'v_efficiency_points');
-- Deve includere SELECT per anon, authenticated, service_role come prima
-- della migration (create view ricrea l'oggetto: i grant ripartono dai
-- default privileges dello schema, non vanno dati per scontati).
-- ============================================================
