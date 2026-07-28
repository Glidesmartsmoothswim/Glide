-- Test di regressione C-1 (role lock). Fallisce (RAISE) se il fix viene rimosso.
-- Esegui nel SQL editor Supabase o via MCP. Verifica la STRUTTURA della difesa,
-- non l'impersonazione (quella è il test manuale della checklist S-1).
do $$
declare
  has_trigger boolean;
  policy_freezes_role boolean;
begin
  -- 1) Il trigger "bretella" esiste ancora.
  select exists (
    select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'profiles'
      and t.tgname = 'protect_role_column' and not t.tgisinternal
  ) into has_trigger;
  if not has_trigger then
    raise exception 'C-1 FAIL: trigger protect_role_column mancante su profiles';
  end if;

  -- 2) La policy UPDATE "cintura" congela role nel ramo self.
  select bool_or(pg_get_expr(polwithcheck, polrelid) ilike '%role =%')
  from pg_policy p join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'profiles' and p.polcmd in ('w','*')
  into policy_freezes_role;
  if not coalesce(policy_freezes_role, false) then
    raise exception 'C-1 FAIL: nessuna policy UPDATE su profiles congela role';
  end if;

  raise notice 'C-1 OK: trigger + policy role-freeze presenti';
end $$;
