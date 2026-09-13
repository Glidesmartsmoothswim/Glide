-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- GLIDE — migration_060_self_workout_tier_rls.sql
-- PROMPT_CODE_GATING A2 — il builder self-service non è per i Base.
--
-- DOVE STA IL GATE, OGGI (verificato prima di toccare nulla): nel codice
-- applicativo, non in una policy permissiva lasciata scoperta.
-- `src/app/app/nuoto/self-actions.ts:createSelfWorkout` apre con
--     if (!canAccess(accessTier(profile), "open:self")) return { error: ... }
-- e ACCESS_MATRIX dà "open:self" a ['open','open_plus']. Anche la UI nasconde
-- il builder (src/app/app/nuoto/page.tsx). Quindi il buco NON è sfruttabile
-- dall'app: per passare di qui bisogna chiamare PostgREST a mano col proprio
-- JWT, dove nessun `if` in TypeScript può fermarti.
--
-- È esattamente il caso di ADR-018/migration_058: un controllo che esiste in
-- un solo strato non è un controllo, è una consuetudine. Qui si chiude sotto.
--
-- NOTA sui tier ammessi. Il prompt chiede open/open_plus/one_to_one; access.ts
-- concede "open:self" solo a open/open_plus, perché il percorso 1:1 ha la
-- programmazione scritta dal coach e il Canale Open è il supporto per gli
-- altri due. La policy segue il prompt ed è quindi un filo più larga
-- dell'app: va bene per un backstop (l'app resta la regola più stretta, e
-- l'effetto pratico oggi è Open/Open+), ma le due vanno riallineate quando si
-- decide se il 1:1 debba avere il builder. Ciò che conta qui, e che entrambe
-- le letture garantiscono, è che `free` sia fuori.
--
-- Non tocco UPDATE/DELETE sul proprio `self`: quelli sono ownership, non
-- livello. Chi scende a Base resta padrone di ciò che ha già scritto — è la
-- stessa regola di "l'archivio degli svolti resta mio" (src/lib/access.ts).
-- ============================================================

drop policy if exists "workouts: nuotatore scrive il proprio self" on public.workouts;

create policy "workouts: nuotatore scrive il proprio self"
  on public.workouts
  for insert to public
  with check (
    kind = 'self'
    and swimmer_id = auth.uid()
    and public.my_tier() in ('open', 'open_plus', 'one_to_one')
  );
