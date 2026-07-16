-- ============================================================
-- GLIDE — migration_008_badges.sql  (FASE 6: Badge)
--
-- Regola d'oro (GLIDE_GAMIFICATION §5): i badge migliori li dà il COACH.
-- Niente premi di partecipazione: ogni badge va guadagnato. I conferiti
-- (giudizio umano) danno valore agli automatici (fatti dell'algoritmo).
-- ============================================================

create table public.badges (
  code        text primary key,
  name        text not null,
  description text not null,
  kind        text not null check (kind in ('auto','conferred')),
  emoji       text,
  sort        int  not null default 0
);

insert into public.badges (code,name,description,kind,emoji,sort) values
  ('prima_bracciata','Prima Bracciata','Primo ciclo completo: readiness pre → seduta → readiness post','auto','🥇',1),
  ('prime_onde','Prime Onde','4 settimane consecutive di aderenza ≥ 75%','auto','🌊',2),
  ('acqua_calma','Acqua Calma','La readiness torna a baseline entro 36h dopo una Z5 — premia il recupero','auto','🧘',3),
  ('metronomo','Metronomo','Passo costante entro ±3% su una serie lunga — controllo, non velocità','auto','⏱️',4),
  ('tecnico','Tecnico','Bracciate per vasca ridotte in modo stabile su 8 settimane','auto','🎯',5),
  ('costruttore','Costruttore','12 settimane di volume prescritto tollerato senza cali di readiness','auto','🧱',6),
  ('onda_dopo_onda','Onda dopo Onda','6 mesi senza un mese intero fermo','auto','🔁',7),
  ('capitano','Capitano','Tiene su gli altri nel Canale Open','conferred','⚓',8),
  ('occhio_in_acqua','Occhio in Acqua','Il coach ha visto un salto tecnico nel video','conferred','👁️',9)
on conflict (code) do nothing;

create table public.swimmer_badges (
  id          uuid primary key default gen_random_uuid(),
  swimmer_id  uuid not null references public.profiles(id) on delete cascade,
  badge_code  text not null references public.badges(code),
  awarded_at  timestamptz not null default now(),
  awarded_by  uuid references public.profiles(id),   -- il coach, per i conferiti
  note        text,
  unique (swimmer_id, badge_code)
);

create index on public.swimmer_badges (swimmer_id);

alter table public.badges         enable row level security;
alter table public.swimmer_badges enable row level security;

create policy r_badges on public.badges for select to authenticated using (true);
create policy w_badges on public.badges for all to authenticated using (public.is_coach()) with check (public.is_coach());

-- Il nuotatore vede i PROPRI badge; il coach tutto. Scrittura solo coach
-- (i conferiti dal coach; gli automatici via service-role dal cron).
create policy r_sb on public.swimmer_badges
  for select to authenticated using (swimmer_id = auth.uid() or public.is_coach());
create policy w_sb on public.swimmer_badges
  for all to authenticated using (public.is_coach()) with check (public.is_coach());
