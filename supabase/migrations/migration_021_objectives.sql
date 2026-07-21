-- ============================================================
-- GLIDE — migration_021_objectives.sql  (Onda 13.3 · Obiettivi multipli)
-- Un atleta può avere più obiettivi attivi. NIENTE percentuali/punteggi:
-- un obiettivo è una direzione condivisa col coach, non una metrica.
-- Migra i goal singoli dall'intake (deprecato, non cancellato).
-- ============================================================

create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  swimmer_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  kind text not null default 'gara'
    check (kind in ('gara','tecnica','benessere','evento')),
  target_date date,
  status text not null default 'attivo'
    check (status in ('attivo','raggiunto','archiviato')),
  created_at timestamptz not null default now()
);

alter table public.objectives enable row level security;

drop policy if exists "objectives: il nuotatore gestisce i propri" on public.objectives;
create policy "objectives: il nuotatore gestisce i propri" on public.objectives
  for all to public
  using (swimmer_id = auth.uid())
  with check (swimmer_id = auth.uid());

drop policy if exists "objectives: il coach legge" on public.objectives;
create policy "objectives: il coach legge" on public.objectives
  for select to public using (public.is_coach());

create index if not exists objectives_swimmer_idx
  on public.objectives (swimmer_id, status);

-- Migrazione goal singolo (intake.goal_primary/goal_note) → objectives.
insert into public.objectives (swimmer_id, title, kind, status)
select
  i.user_id,
  case i.goal_primary
    when 'gara' then 'Prepararmi a una gara'
    when 'tecnica' then 'Tecnica'
    when 'resistenza' then 'Resistenza'
    when 'velocita' then 'Velocità'
    when 'forma' then 'Rimettermi in forma'
    when 'benessere' then 'Benessere / costanza'
    else i.goal_primary
  end
  || case when coalesce(i.goal_note,'') <> '' then ' — ' || i.goal_note else '' end,
  case i.goal_primary
    when 'gara' then 'gara'
    when 'benessere' then 'benessere'
    else 'tecnica'
  end,
  'attivo'
from public.intake i
where coalesce(i.goal_primary,'') <> ''
  and not exists (
    select 1 from public.objectives o where o.swimmer_id = i.user_id
  );
