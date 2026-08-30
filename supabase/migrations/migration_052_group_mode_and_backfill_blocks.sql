-- ============================================================
-- GLIDE — migration_052_group_mode_and_backfill_blocks.sql (post-lancio, hotfix)
-- 1) Slot fantasma lezioni di gruppo: group_30/45/60 avevano mode='pool',
--    quindi ereditavano ogni finestra di disponibilità aperta per le
--    lezioni private (nessuna era mai stata "pubblicata" per il gruppo).
--    Nuovo mode 'group' distinto — nessuna availability_rules.modes lo
--    include oggi, quindi gli slot fantasma spariscono senza toccare le
--    regole esistenti. 0 booking reali su lezioni di gruppo esistevano.
-- 2) Backfill workout_completions.blocks: le righe precedenti a
--    migration_049 sono rimaste al default '[]', mai riempite
--    retroattivamente — "Distribuzione carico" risultava vuota per tutti.
-- ============================================================

alter table public.services
  drop constraint services_mode_check,
  add constraint services_mode_check check (mode = any (array['pool'::text, 'remote'::text, 'group'::text]));

alter table public.bookings
  drop constraint bookings_mode_check,
  add constraint bookings_mode_check check (mode = any (array['pool'::text, 'remote'::text, 'group'::text]));

update public.services set mode = 'group' where code like 'group_%';

update public.workout_completions wc
set blocks = w.blocks
from public.workouts w
where wc.workout_id = w.id
  and jsonb_array_length(wc.blocks) = 0
  and jsonb_array_length(w.blocks) > 0;
