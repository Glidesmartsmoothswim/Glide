-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- ============================================================
-- GLIDE — migration_059_library_visibility_rls.sql
-- PROMPT_CODE_GATING A1 — la lettura di `library_items` rispetta `visibility`.
--
-- STATO PRECEDENTE: l'unica regola di lettura era `published OR is_coach()`.
-- La colonna `visibility` esisteva e non era usata da nessuna policy.
--
-- Era una scelta deliberata (migration_020): metadati leggibili da tutti per
-- mostrare il lucchetto e l'invito all'upgrade, file protetto lato server
-- dall'URL firmato in /app/libreria/[id]/open. Il buco però è reale e non sta
-- nei metadati: `url` e `file_key` sono nella stessa riga, e PostgREST li
-- serve a chiunque abbia un JWT valido —
--     GET /rest/v1/library_items?select=url&published=eq.true
-- Per kind='link' e kind='video' quella `url` NON è un metadato: è il
-- contenuto. Un Base poteva leggersi l'indirizzo di un video Open+ senza mai
-- passare dalla rotta che lo protegge.
--
-- CONSEGUENZA DI PRODOTTO, da sapere: i contenuti di livello superiore ora
-- spariscono dall'elenco invece di comparire col lucchetto. Si perde l'invito
-- all'upgrade in libreria. La pagina resta corretta (mostra solo ciò che si
-- può aprire) e l'invito resta su /app/abbonamenti. Se il committente rivuole
-- la vetrina, la strada è esporre un conteggio aggregato, non riaprire la riga.
--
-- `visibility` ha GIÀ il suo vincolo — `library_items_visibility_check`,
-- in ('free','open','open_plus','one_to_one') da migration_020: il check
-- chiesto dal prompt non serve, è già lì. Verificato in produzione.
-- ============================================================

drop policy if exists "library: pubblicati o coach" on public.library_items;

create policy "library: pubblicati e di livello, o coach"
  on public.library_items
  for select to public
  using (
    public.is_coach()
    or (
      published
      and case visibility
        when 'free'       then true
        when 'open'       then public.my_tier() in ('open', 'open_plus', 'one_to_one')
        when 'open_plus'  then public.my_tier() in ('open_plus', 'one_to_one')
        when 'one_to_one' then public.my_tier() = 'one_to_one'
        else false   -- visibilità sconosciuta = chiusa, mai aperta per default
      end
    )
  );

comment on column public.library_items.visibility is
  'Livello MINIMO che sblocca il contenuto (asse A, come profiles.tier). '
  'Applicata in RLS da migration_059 e in UI/route da src/lib/access.ts '
  '(canOpenLibraryItem). Le due devono restare d''accordo.';
