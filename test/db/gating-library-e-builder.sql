-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- Test di regressione PROMPT_CODE_GATING A1 + A2
-- (migration_059_library_visibility_rls, migration_060_self_workout_tier_rls).
--
-- Come in ADR-018/ADR-019, l'impersonazione è VERA e non strutturale: si
-- assume il ruolo e si legge/scrive davvero. Un test che guarda l'elenco
-- delle policy non distingue "policy assente" da "policy presente ma
-- permissiva" — ed è esattamente così che il buco su `transactions` è
-- passato inosservato per mesi.
--
-- Va eseguito DENTRO una transazione con ROLLBACK: scrive righe di prova.
--   begin; \i test/db/gating-library-e-builder.sql rollback;
--
-- Richiede che migration_059 e migration_060 siano già applicate: senza,
-- fallisce — ed è il punto, perché è la prova che servivano.

do $$
declare
  free_id    uuid;
  open_id    uuid;
  coach_id   uuid;
  visti      int;
  scritto    boolean;
begin
  select id into free_id  from public.profiles where role='swimmer' and tier='free'  limit 1;
  select id into open_id  from public.profiles where role='swimmer' and tier in ('open','open_plus') limit 1;
  select id into coach_id from public.profiles where role='coach' limit 1;
  if free_id is null or open_id is null or coach_id is null then
    raise notice 'GATING SKIP: servono un free, un open/open_plus e un coach';
    return;
  end if;

  -- Contenuti di prova, uno per livello. `published` = true: è il caso che
  -- conta, perché prima bastava quello per renderli leggibili a chiunque.
  insert into public.library_items (title, kind, url, visibility, published)
  values ('PROVA free',      'link', 'https://example.invalid/free',  'free',      true),
         ('PROVA open',      'link', 'https://example.invalid/open',  'open',      true),
         ('PROVA open_plus', 'link', 'https://example.invalid/plus',  'open_plus', true);

  -- --- A1.1 — un Base vede SOLO il contenuto free -------------------------
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', free_id), true);
  set local role authenticated;
  select count(*) into visti from public.library_items where title like 'PROVA %';
  reset role;
  if visti <> 1 then
    raise exception 'A1 FAIL: un Base vede % contenuti di prova su 3, atteso 1 (solo free)', visti;
  end if;

  -- --- A1.2 — e in particolare NON legge la url di un Open+ ---------------
  -- Il punto vero: per kind='link' la `url` non è un metadato, è il
  -- contenuto. Prima bastava un JWT valido per leggersela via PostgREST.
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', free_id), true);
  set local role authenticated;
  select count(*) into visti from public.library_items
   where url = 'https://example.invalid/plus';
  reset role;
  if visti <> 0 then
    raise exception 'A1 FAIL: un Base legge la url di un contenuto Open+';
  end if;

  -- --- A1.3 — il coach continua a vedere tutto ----------------------------
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', coach_id), true);
  set local role authenticated;
  select count(*) into visti from public.library_items where title like 'PROVA %';
  reset role;
  if visti <> 3 then
    raise exception 'A1 FAIL: il coach vede % contenuti di prova su 3', visti;
  end if;

  -- --- A2.1 — un Base NON può creare un allenamento self ------------------
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', free_id), true);
  set local role authenticated;
  scritto := true;
  begin
    insert into public.workouts (coach_id, swimmer_id, kind, title, pool, week_start, blocks, total_meters)
    values (coach_id, free_id, 'self', 'PROVA builder da Base', 25, current_date, '[]'::jsonb, 0);
  exception when insufficient_privilege or check_violation then
    scritto := false;
  end;
  reset role;
  if scritto then
    raise exception 'A2 FAIL: un Base ha creato un allenamento self — il builder non è suo';
  end if;

  -- --- A2.2 — un Open sì, altrimenti abbiamo chiuso troppo ----------------
  perform set_config('request.jwt.claims',
    format('{"sub":"%s","role":"authenticated"}', open_id), true);
  set local role authenticated;
  begin
    insert into public.workouts (coach_id, swimmer_id, kind, title, pool, week_start, blocks, total_meters)
    values (coach_id, open_id, 'self', 'PROVA builder da Open', 25, current_date, '[]'::jsonb, 0);
  exception when others then
    reset role;
    raise exception 'A2 FAIL: un Open NON riesce a usare il builder (% — %)', sqlstate, sqlerrm;
  end;
  reset role;

  raise notice 'GATING OK: A1 (libreria per visibility) e A2 (builder non ai Base) verificati.';
end $$;
