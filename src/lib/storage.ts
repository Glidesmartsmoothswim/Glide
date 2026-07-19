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
