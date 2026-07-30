-- ============================================================
-- GLIDE — migration_032_medcert_no_file.sql  (Onda 26 · minimizzazione GDPR)
-- Decisione del titolare: del certificato medico si conserva SOLO la
-- scadenza + un flag di validità autodichiarato. Il file NON si archivia
-- più (minimizzazione, Art. 5(1)(c) GDPR).
--
-- Go-forward: le nuove registrazioni non caricano alcun file.
-- NON distruttivo: righe e bucket `medical` esistenti restano invariati.
-- L'eventuale purga dei PDF già caricati è uno step manuale separato (non
-- eseguito qui: cancellare dati sanitari è irreversibile e va confermato).
-- ============================================================

alter table public.medical_certificates
  alter column file_key drop not null,
  add column if not exists dichiarato boolean not null default false;

comment on column public.medical_certificates.file_key is
  'Deprecato (Onda 26): non si archivia più il documento. Nullable, resta solo per le righe storiche.';
comment on column public.medical_certificates.dichiarato is
  'Autodichiarazione dell''atleta: dichiara di possedere un certificato valido fino a data_scadenza.';
