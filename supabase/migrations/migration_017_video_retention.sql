-- ============================================================
-- GLIDE — migration_017_video_retention.sql  (Sprint V.2)
-- Cancellazione utente (soft/hard) + retention agganciata al macrociclo.
-- Additiva. La cancellazione FISICA del file resta in lib/storage.ts.
-- ============================================================

alter table public.race_videos
  -- soft delete (finestra 7 giorni), poi hard delete via cron
  add column if not exists deleted_at timestamptz,
  -- hard delete = file rimosso, riga tenuta come tombstone (i commenti
  -- del coach hanno FK CASCADE su race_videos: NON vanno persi)
  add column if not exists purged_at timestamptz,
  -- retention: attivo → archiviato (chiusura macrociclo) → purge (+90gg)
  add column if not exists retention_state text not null default 'active'
    check (retention_state in ('active', 'archived', 'preserved')),
  add column if not exists archived_at timestamptz,
  -- macrociclo di appartenenza (FK aggiunta in V.3 con la tabella programs)
  add column if not exists program_id uuid;

create index if not exists idx_race_videos_deleted_at
  on public.race_videos(deleted_at) where deleted_at is not null;
create index if not exists idx_race_videos_program
  on public.race_videos(program_id);
create index if not exists idx_race_videos_retention
  on public.race_videos(retention_state);
