-- Test di regressione C-2 (idempotenza webhook Stripe). Fallisce (RAISE) se il
-- fix viene rimosso. La verifica di FIRMA è coperta dal codice (constructEvent);
-- qui verifichiamo l'infrastruttura di dedup e la sua semantica.
do $$
declare
  has_table boolean;
  dup_blocked boolean := false;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'stripe_events'
  ) into has_table;
  if not has_table then
    raise exception 'C-2 FAIL: tabella stripe_events mancante';
  end if;

  -- La PK su id deve rifiutare un secondo inserimento dello stesso event.id.
  begin
    insert into public.stripe_events (id, type) values ('evt_test_dedup', 'test');
    begin
      insert into public.stripe_events (id, type) values ('evt_test_dedup', 'test');
    exception when unique_violation then
      dup_blocked := true;
    end;
    delete from public.stripe_events where id = 'evt_test_dedup';
  end;

  if not dup_blocked then
    raise exception 'C-2 FAIL: stripe_events non deduplica per event.id';
  end if;

  raise notice 'C-2 OK: stripe_events presente e deduplicante';
end $$;
