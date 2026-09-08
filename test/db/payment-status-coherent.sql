-- Test di regressione M3 (GLIDE_DB_CHANGES_001 / migration_054).
-- Fallisce (RAISE) se il vincolo torna a parlare del solo contante, cioè se
-- il database ricomincia a rifiutare una prenotazione pagata per bonifico.
--
-- Verifica la STRUTTURA del vincolo e la coerenza dei dati, non l'insert:
-- una prova pratica richiede coach/swimmer/service reali e va fatta in
-- transazione con ROLLBACK sul DB live (stesso metodo di
-- test/security/rpc-ownership-lesson-tokens.sql). Quella prova è la verifica
-- da eseguire subito dopo l'apply, ed è annotata in STATO.md.
do $$
declare
  def text;
  old_still_there boolean;
  incoerenti int;
begin
  select exists (
    select 1 from pg_constraint
    where conrelid = 'public.bookings'::regclass and conname = 'cash_needs_status'
  ) into old_still_there;
  if old_still_there then
    raise exception 'M3 FAIL: cash_needs_status esiste ancora — il bonifico con stato di incasso viene rifiutato';
  end if;

  select pg_get_constraintdef(oid) into def
  from pg_constraint
  where conrelid = 'public.bookings'::regclass and conname = 'payment_status_coherent';
  if def is null then
    raise exception 'M3 FAIL: payment_status_coherent assente su public.bookings';
  end if;
  if def not ilike '%bank_transfer%' or def not ilike '%cash%' then
    raise exception 'M3 FAIL: payment_status_coherent non copre entrambi i metodi incassati a mano: %', def;
  end if;

  -- La regola dev'essere vera sui dati, non solo a schema (un vincolo
  -- aggiunto NOT VALID passerebbe il check strutturale e non i dati).
  select count(*) into incoerenti
  from public.bookings
  where (payment_method in ('cash','bank_transfer')) <> (payment_status is not null);
  if incoerenti > 0 then
    raise exception 'M3 FAIL: % prenotazioni con metodo e stato di incasso incoerenti', incoerenti;
  end if;

  raise notice 'M3 OK: contante e bonifico richiedono lo stato di incasso, gli altri metodi lo escludono';
end $$;
