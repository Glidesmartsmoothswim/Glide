-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- migration_053 — M-6: limiti di upload sui video gara.
--
-- RISCRITTA il 13/09/2026. La versione precedente chiedeva 500 MB
-- (524288000 byte) e avvertiva: «se il limite globale dello Storage è più
-- basso, va alzato da Dashboard, altrimenti questo valore resta lettera
-- morta». È successo esattamente questo, e la migrazione non risultava
-- nemmeno applicata: in produzione `file_size_limit` e `allowed_mime_types`
-- del bucket erano entrambi NULL.
--
-- IL TETTO NON È ALZABILE. Il progetto sta sul piano Free: il limite globale
-- dello Storage è 50 MB e resta 50 MB. Un valore di bucket più alto del
-- globale non estende niente — il limite effettivo è sempre
-- min(globale, bucket) — quindi chiedere 500 MB significava scrivere un
-- numero che non poteva avere effetto. Ora il bucket dichiara il vero tetto.
--
--   50 MB = 50 * 1024 * 1024 = 52428800 byte
--   'video/*' → wildcard supportata da Supabase Storage.
--
-- Questo è ANCHE il cancello vero: il browser carica il file direttamente su
-- Storage, quindi i controlli in `components/video/uploader.tsx` e in
-- `registerVideo` sono difesa in profondità. Ma un cancello che si limita a
-- respingere non basta a 50 MB, che per un video girato col telefono è poco:
-- l'app comprime lato client prima di caricare (src/lib/video-compress.ts) e
-- lo dice chiaramente se dopo la compressione il file resta troppo grande.
--
-- I 7 record senza `storage_path` in produzione — 6 dello stesso nuotatore,
-- lo stesso giorno, sullo stesso evento — sono la firma di questo problema:
-- caricamenti partiti e morti contro un limite che l'app non conosceva.

update storage.buckets
   set file_size_limit = 52428800,
       allowed_mime_types = array['video/*']
 where id = 'race-videos';
