-- Test di regressione ADR-018 / migration_057.
-- Fallisce (RAISE) se l'IBAN del coach torna leggibile da chi non è il coach.
--
-- Qui l'impersonazione è vera, non strutturale: si assume il ruolo `anon` e
-- quello di un nuotatore reale dentro una transazione, si legge davvero
-- `app_config` e si guarda cosa esce. Un check sul solo testo della policy
-- non intercetterebbe, per esempio, una seconda policy permissiva aggiunta
-- accanto (in RLS le policy si sommano in OR).
do $$
declare
  swimmer_id uuid;
  visti int;
  grace int;
begin
  select id into swimmer_id from public.profiles where role = 'swimmer' limit 1;

  -- anon: nessun JWT.
  set local role anon;
  select count(*) into visti from public.app_config
   where key in ('payment_iban', 'payment_intestatario');
  reset role;
  if visti > 0 then
    raise exception 'ADR-018 FAIL: anon legge ancora % chiavi di coordinate', visti;
  end if;

  if swimmer_id is not null then
    perform set_config('request.jwt.claims',
      format('{"sub":"%s","role":"authenticated"}', swimmer_id), true);
    set local role authenticated;
    select count(*) into visti from public.app_config
     where key in ('payment_iban', 'payment_intestatario');
    -- Il gate ad accesso legge payment_grace_days a ogni richiesta: se la
    -- restrizione fosse stata data su tutta la tabella, qui sparirebbe e il
    -- gate cadrebbe sul default silenziosamente.
    select count(*) into grace from public.app_config where key = 'payment_grace_days';
    reset role;
    if visti > 0 then
      raise exception 'ADR-018 FAIL: un nuotatore autenticato legge ancora le coordinate';
    end if;
    if grace <> 1 then
      raise exception 'ADR-018 FAIL: il nuotatore non legge più payment_grace_days — gate ad accesso rotto';
    end if;
  end if;
end $$;
