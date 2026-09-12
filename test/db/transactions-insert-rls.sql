-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- Test di regressione ADR-019 / migration_058.
-- Fallisce (RAISE) se il coach torna a NON poter scrivere un ricavo, o se un
-- nuotatore può scriverne uno.
--
-- Come in ADR-018, l'impersonazione è vera e non strutturale: si assumono i
-- ruoli e si SCRIVE davvero. È esattamente il controllo che mancava — la
-- policy SELECT esisteva e sembrava tutto a posto, mentre l'assenza di una
-- policy INSERT rendeva `transactions` non scrivibile da nessuno se non da
-- `service_role`. Un test che guarda l'elenco delle policy non avrebbe
-- distinto "policy assente" da "policy presente ma permissiva".
--
-- Va eseguito dentro una transazione con ROLLBACK (o su un branch usa e
-- getta): scrive righe di prova, e le cancella solo se arriva in fondo.
do $$
declare
  coach uuid;
  swimmer uuid;
  scritte int;
  marker text := 'REGRESSIONE migration_058 — riga di prova';
begin
  select id into coach from public.profiles where role = 'coach' limit 1;
  select id into swimmer from public.profiles where role = 'swimmer' limit 1;
  if coach is null or swimmer is null then
    raise notice 'ADR-019 SKIP: serve almeno un coach e un nuotatore';
    return;
  end if;

  -- --- 1. Il coach DEVE poter scrivere un ricavo -------------------------
  -- Uno per tipo: `lesson` è nuovo di migration_058 e il vecchio CHECK
  -- l'avrebbe rifiutato anche con la policy a posto.
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', coach), true);
  set local role authenticated;
  begin
    insert into public.transactions
      (swimmer_id, type, amount_cents, currency, status, description)
    values
      (swimmer, 'subscription', 1, 'eur', 'succeeded', marker),
      (swimmer, 'lesson',       1, 'eur', 'succeeded', marker),
      (swimmer, 'package',      1, 'eur', 'succeeded', marker),
      (swimmer, 'birra',        1, 'eur', 'succeeded', marker);
  exception when others then
    reset role;
    raise exception 'ADR-019 FAIL: il coach non può scrivere un ricavo (% — %)',
      sqlstate, sqlerrm;
  end;
  reset role;

  select count(*) into scritte from public.transactions where description = marker;
  if scritte <> 4 then
    raise exception 'ADR-019 FAIL: attese 4 righe dal coach, scritte %', scritte;
  end if;

  -- --- 2. Un nuotatore NON deve poterne scrivere -------------------------
  -- Se potesse, potrebbe dichiarare da sé di aver pagato: i ricavi li
  -- registra solo chi incassa.
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', swimmer), true);
  set local role authenticated;
  begin
    insert into public.transactions
      (swimmer_id, type, amount_cents, currency, status, description)
    values (swimmer, 'lesson', 1, 'eur', 'succeeded', marker);
    reset role;
    raise exception 'ADR-019 FAIL: un nuotatore ha potuto scrivere un ricavo';
  exception
    when insufficient_privilege then
      reset role; -- atteso
    when others then
      reset role;
      raise;
  end;

  -- --- 3. Il tipo resta un insieme chiuso -------------------------------
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', coach), true);
  set local role authenticated;
  begin
    insert into public.transactions
      (swimmer_id, type, amount_cents, currency, status, description)
    values (swimmer, 'tipo_inventato', 1, 'eur', 'succeeded', marker);
    reset role;
    raise exception 'ADR-019 FAIL: il CHECK su transactions.type accetta un tipo sconosciuto';
  exception
    when check_violation then
      reset role; -- atteso
    when others then
      reset role;
      raise;
  end;

  delete from public.transactions where description = marker;
  raise notice 'ADR-019 OK: il coach scrive i ricavi, il nuotatore no, i tipi sono chiusi';
end $$;
