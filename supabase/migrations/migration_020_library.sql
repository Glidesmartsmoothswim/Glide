-- ============================================================
-- GLIDE — migration_020_library.sql  (Onda 12.2 · Sezione Libreria)
-- Materiale di consultazione (ebook/booklet PDF; in futuro video e link).
-- File su storage privato (bucket `library`), letti SOLO via URL firmati.
-- La visibilità gating segue i tier (lib/access.ts). Il gate del FILE è
-- lato server (URL firmato solo se canOpenLibraryItem); i METADATI (titolo,
-- cover, descrizione) sono leggibili da tutti i tier → lucchetto + invito.
-- ============================================================

create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  kind text not null default 'pdf' check (kind in ('pdf','video','link')),
  file_key text,     -- oggetto storage (pdf/cover). NULL per i link.
  url text,          -- per kind='link' o video esterno.
  cover_key text,    -- oggetto storage per la copertina (opzionale).
  visibility text not null default 'free'
    check (visibility in ('free','open','open_plus','one_to_one')),
  published boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.library_items enable row level security;

-- Metadati leggibili se pubblicato (qualunque tier) o se sei il coach.
drop policy if exists "library: pubblicati o coach" on public.library_items;
create policy "library: pubblicati o coach" on public.library_items
  for select to public using (published or public.is_coach());

-- Scrittura: solo coach.
drop policy if exists "library: solo coach scrive" on public.library_items;
create policy "library: solo coach scrive" on public.library_items
  for all to public using (public.is_coach()) with check (public.is_coach());

create index if not exists library_items_pub_idx
  on public.library_items (published, sort, created_at desc);

-- Bucket storage privato per i file libreria ------------------------------------
insert into storage.buckets (id, name, public)
values ('library', 'library', false)
on conflict (id) do nothing;

-- Il coach carica/aggiorna/rimuove gli oggetti del bucket dal browser.
-- La LETTURA avviene via URL firmati generati con la service_role → nessuna
-- policy di select pubblica necessaria.
drop policy if exists "library objects: coach scrive" on storage.objects;
create policy "library objects: coach scrive" on storage.objects
  for all to authenticated
  using (bucket_id = 'library' and public.is_coach())
  with check (bucket_id = 'library' and public.is_coach());
