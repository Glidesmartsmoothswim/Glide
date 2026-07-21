-- ============================================================
-- GLIDE — migration_022_medical_certificates.sql  (Onda 13.2)
-- DATO SANITARIO. Privacy non negoziabile:
--  - bucket PRIVATO dedicato `medical`; accesso solo via URL firmati brevi;
--  - RLS: legge SOLO l'atleta proprietario e il coach; scrive solo il proprietario;
--  - il file non compare mai in liste/cover/anteprime fuori dalle due viste dedicate.
-- ============================================================

create table if not exists public.medical_certificates (
  id uuid primary key default gen_random_uuid(),
  swimmer_id uuid not null references public.profiles(id) on delete cascade,
  file_key text not null,
  mime_type text,
  data_scadenza date not null,
  note text,
  uploaded_at timestamptz not null default now()
);

alter table public.medical_certificates enable row level security;

-- Legge: proprietario o coach. Scrive/cancella: solo il proprietario.
drop policy if exists "medcert: proprietario o coach legge" on public.medical_certificates;
create policy "medcert: proprietario o coach legge" on public.medical_certificates
  for select to public using (swimmer_id = auth.uid() or public.is_coach());

drop policy if exists "medcert: il proprietario inserisce" on public.medical_certificates;
create policy "medcert: il proprietario inserisce" on public.medical_certificates
  for insert to public with check (swimmer_id = auth.uid());

drop policy if exists "medcert: il proprietario cancella" on public.medical_certificates;
create policy "medcert: il proprietario cancella" on public.medical_certificates
  for delete to public using (swimmer_id = auth.uid());

create index if not exists medcert_swimmer_idx
  on public.medical_certificates (swimmer_id, data_scadenza desc);

-- Bucket privato dedicato.
insert into storage.buckets (id, name, public)
values ('medical', 'medical', false)
on conflict (id) do nothing;

-- Solo il proprietario tocca i propri oggetti (cartella = suo uuid).
-- Il coach NON ha policy storage: apre il documento via URL firmato generato
-- lato server con service_role (le due viste dedicate), niente altro.
drop policy if exists "medical objects: solo proprietario" on storage.objects;
create policy "medical objects: solo proprietario" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'medical'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'medical'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
