-- SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
-- Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
-- Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
-- l'addestramento di sistemi di intelligenza artificiale sono vietati
-- senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

-- migration_053 — M-6: limiti di upload sui video gara.
--
-- Unico livello che blocca DAVVERO l'upload: il browser carica il file
-- direttamente su Storage, quindi i check in `components/video/uploader.tsx`
-- e in `registerVideo` (server action) sono difesa in profondità, non il
-- cancello. Qui si chiude il cancello.
--
--   500 MB = 500 * 1024 * 1024 = 524288000 byte
--   'video/*' → wildcard supportata da Supabase Storage.
--
-- NOTA: il limite EFFETTIVO è min(limite globale del progetto, questo).
-- Se il limite globale dello Storage è più basso (default Supabase: 50 MB),
-- va alzato ad almeno 500 MB da Dashboard → Storage → Settings, altrimenti
-- questo valore resta lettera morta.

update storage.buckets
   set file_size_limit = 524288000,
       allowed_mime_types = array['video/*']
 where id = 'race-videos';
