-- Test di regressione C-7 (S-5, PROMPT_CODE_SEC_S5.md): la policy
-- "bands_read" su public.zone_rpe_bands è scoped a `authenticated`, non più
-- a PUBLIC/anon. Fallisce (RAISE) se torna aperta o se lo scoping sparisce.
--
-- Verifica la STRUTTURA della difesa (ruoli della policy), non solo
-- l'impersonazione — quella è stata comunque eseguita LIVE: un anon vede
-- 0 righe da `select * from zone_rpe_bands` (RLS filtra, il grant SELECT a
-- livello tabella resta — è la policy a fare lo scoping, come ovunque nello
-- schema), un authenticated ne vede tutte e 5 (Z1-Z5). `bands_write`
-- (scoped a is_coach()) non è stata toccata. Stesso metodo di
-- lesson-token-anon-execute.sql — vedi nota lì sul perché .sql e non
-- .test.ts. Dettaglio in STATO.md.
do $$
declare
  read_roles name[];
  write_using text;
begin
  select array_agg(r.rolname order by r.rolname)
  into read_roles
  from pg_policy p
  join lateral unnest(p.polroles) as role_oid on true
  join pg_roles r on r.oid = role_oid
  where p.polrelid = 'public.zone_rpe_bands'::regclass and p.polname = 'bands_read';

  if read_roles is null or read_roles <> array['authenticated']::name[] then
    raise exception 'C-7 (S-5) FAIL: bands_read non è scoped esclusivamente a authenticated (trovato: %)', read_roles;
  end if;

  select pg_get_expr(polqual, polrelid) into write_using
  from pg_policy where polrelid = 'public.zone_rpe_bands'::regclass and polname = 'bands_write';
  if write_using is distinct from 'is_coach()' then
    raise exception 'C-7 (S-5) FAIL: bands_write è stata toccata (doveva restare invariata, using=is_coach())';
  end if;

  raise notice 'C-7 (S-5) OK: bands_read scoped a authenticated, bands_write invariata (is_coach())';
end $$;
