-- Test di regressione ADR-012 / Onda 29.5 (builder self-service Canale Open).
-- Fallisce (RAISE) se il constraint o le policy vengono rimossi/allentati.
-- Verifica la STRUTTURA della difesa (constraint + policy), non
-- l'impersonazione: quella è stata eseguita live (vedi STATO.md, Onda 29.5)
-- con set_config('request.jwt.claims', ...) + set local role authenticated,
-- simulando due nuotatori distinti — 8/8 scenari attesi confermati.
do $$
declare
  kind_allows_self boolean;
  insert_scoped boolean;
  update_scoped boolean;
  delete_scoped boolean;
begin
  -- 1) Il constraint CHECK su kind ammette 'self' (oltre ai kind esistenti).
  select pg_get_constraintdef(oid) ilike '%self%'
  from pg_constraint
  where conrelid = 'public.workouts'::regclass
    and conname = 'workouts_kind_check'
  into kind_allows_self;
  if not coalesce(kind_allows_self, false) then
    raise exception 'ADR-012 FAIL: workouts_kind_check non ammette kind=self';
  end if;

  -- 2) INSERT: esiste una policy che scopa a kind='self' AND swimmer_id = auth.uid().
  select bool_or(
    pg_get_expr(polwithcheck, polrelid) ilike '%self%'
    and pg_get_expr(polwithcheck, polrelid) ilike '%swimmer_id%'
    and pg_get_expr(polwithcheck, polrelid) ilike '%auth.uid()%'
  )
  from pg_policy p join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'workouts' and p.polcmd = 'a'
  into insert_scoped;
  if not coalesce(insert_scoped, false) then
    raise exception 'ADR-012 FAIL: nessuna policy INSERT scopa kind=self + swimmer_id=auth.uid()';
  end if;

  -- 3) UPDATE: stesso scoping SIA in using SIA in with_check (per bloccare
  --    un update che smuggla kind/swimmer_id fuori dal self proprio).
  select bool_or(
    pg_get_expr(polqual, polrelid) ilike '%self%'
    and pg_get_expr(polqual, polrelid) ilike '%auth.uid()%'
    and pg_get_expr(polwithcheck, polrelid) ilike '%self%'
    and pg_get_expr(polwithcheck, polrelid) ilike '%auth.uid()%'
  )
  from pg_policy p join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'workouts' and p.polcmd = 'w'
  into update_scoped;
  if not coalesce(update_scoped, false) then
    raise exception 'ADR-012 FAIL: nessuna policy UPDATE scopa using+with_check a kind=self + swimmer_id=auth.uid()';
  end if;

  -- 4) DELETE: stesso scoping in using.
  select bool_or(
    pg_get_expr(polqual, polrelid) ilike '%self%'
    and pg_get_expr(polqual, polrelid) ilike '%auth.uid()%'
  )
  from pg_policy p join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'workouts' and p.polcmd = 'd'
  into delete_scoped;
  if not coalesce(delete_scoped, false) then
    raise exception 'ADR-012 FAIL: nessuna policy DELETE scopa kind=self + swimmer_id=auth.uid()';
  end if;

  raise notice 'ADR-012 OK: constraint + policy insert/update/delete self scoped presenti';
end $$;
