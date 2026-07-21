import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Punto UNICO di contatto con lo storage fisico dei video.
 * Oggi: Supabase Storage (bucket privato `race-videos`). Domani: R2 →
 * si cambia solo questo file, non la logica di soft/hard delete e retention.
 */
export const VIDEO_BUCKET = "race-videos";

/** Cancellazione FISICA del file (hard delete / purge). No-op se path nullo. */
export async function removeVideoObject(path: string | null): Promise<boolean> {
  if (!path) return false;
  const admin = createAdminClient();
  if (!admin) return false;
  const { error } = await admin.storage.from(VIDEO_BUCKET).remove([path]);
  return !error;
}

/** Signed URL di lettura (breve durata). Null se path assente o storage off. */
export async function videoSignedUrl(
  path: string | null,
  expiresIn = 3600,
): Promise<string | null> {
  if (!path) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.storage
    .from(VIDEO_BUCKET)
    .createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}

/**
 * Bucket Libreria (Onda 12.2). Privato: i file si leggono SOLO via URL
 * firmati (gate lato server per tier). Oggi Supabase Storage; domani R2 →
 * si cambia solo qui (stesso pattern dei video).
 */
export const LIBRARY_BUCKET = "library";

/** Signed URL di un oggetto libreria. Null se key assente o storage off. */
export async function librarySignedUrl(
  key: string | null,
  expiresIn = 3600,
): Promise<string | null> {
  if (!key) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.storage
    .from(LIBRARY_BUCKET)
    .createSignedUrl(key, expiresIn);
  return data?.signedUrl ?? null;
}

/** Firma un gruppo di key libreria in un colpo (per le cover della griglia). */
export async function librarySignedUrls(
  keys: string[],
  expiresIn = 3600,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const clean = keys.filter(Boolean);
  if (!clean.length) return out;
  const admin = createAdminClient();
  if (!admin) return out;
  const { data } = await admin.storage
    .from(LIBRARY_BUCKET)
    .createSignedUrls(clean, expiresIn);
  for (const s of data ?? [])
    if (s.path && s.signedUrl) out.set(s.path, s.signedUrl);
  return out;
}

/** Cancellazione fisica di un oggetto libreria (file o cover). */
export async function removeLibraryObject(key: string | null): Promise<boolean> {
  if (!key) return false;
  const admin = createAdminClient();
  if (!admin) return false;
  const { error } = await admin.storage.from(LIBRARY_BUCKET).remove([key]);
  return !error;
}

/**
 * Bucket certificati medici (Onda 13.2) — DATO SANITARIO, privato. Letto
 * solo via URL firmati a breve scadenza, mai esposto in liste/anteprime.
 */
export const MEDICAL_BUCKET = "medical";

/** Signed URL breve di un certificato medico. */
export async function medicalSignedUrl(
  key: string | null,
  expiresIn = 300,
): Promise<string | null> {
  if (!key) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin.storage
    .from(MEDICAL_BUCKET)
    .createSignedUrl(key, expiresIn);
  return data?.signedUrl ?? null;
}

/** Cancellazione fisica di un certificato medico. */
export async function removeMedicalObject(key: string | null): Promise<boolean> {
  if (!key) return false;
  const admin = createAdminClient();
  if (!admin) return false;
  const { error } = await admin.storage.from(MEDICAL_BUCKET).remove([key]);
  return !error;
}
