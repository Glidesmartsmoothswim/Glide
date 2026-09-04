export type VideoTier = "coaching_1_1" | "open";
export type VideoStatus = "locked" | "pending" | "reviewed";

export type RetentionState = "active" | "archived" | "preserved";

export type VideoRow = {
  id: string;
  swimmer_id: string;
  coach_id: string | null;
  event: string;
  race_date: string | null;
  storage_path: string | null;
  tier: VideoTier;
  status: VideoStatus;
  paid: boolean;
  created_at: string;
  deleted_at: string | null;
  purged_at: string | null;
  retention_state: RetentionState;
  archived_at: string | null;
  program_id: string | null;
};

export type VideoCommentRow = {
  id: string;
  video_id: string;
  coach_id: string;
  body: string;
  at_seconds: number | null;
  created_at: string;
};

export const STATUS_LABEL: Record<VideoStatus, string> = {
  locked: "Bloccato",
  pending: "In coda",
  reviewed: "Analizzato",
};

/** Prezzo birra in centesimi (una tantum sblocco video Open). */
export const BIRRA_CENTS = 500;

/* ------------------------------------------------------------------ *
 * M-6 — limiti di upload (dimensione / tipo).
 *
 * Enforcement su tre livelli, dal più debole al più forte:
 *  1. UI (`components/video/uploader.tsx`): feedback immediato, aggirabile.
 *  2. Server action (`app/app/video/actions.ts`): rilegge i metadati
 *     dell'oggetto caricato e cancella il file se non è conforme.
 *  3. Bucket Storage (`file_size_limit` + `allowed_mime_types`,
 *     migration_053): l'unico che blocca DAVVERO l'upload, lato Supabase.
 * ------------------------------------------------------------------ */

/** Dimensione massima di un video gara: 500 MB. */
export const VIDEO_MAX_BYTES = 500 * 1024 * 1024;
export const VIDEO_MAX_MB = Math.round(VIDEO_MAX_BYTES / (1024 * 1024));

/** Estensioni note → MIME: alcuni browser lasciano `File.type` vuoto. */
const VIDEO_EXT_MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  "3gp": "video/3gpp",
  mpg: "video/mpeg",
  mpeg: "video/mpeg",
};

export const VIDEO_EXT_LABEL = "mp4, mov, m4v, webm, mkv, avi, 3gp, mpeg";

/** MB con una decimale, per i messaggi d'errore. */
export function videoMb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1).replace(".", ",");
}

/**
 * Content-type da mandare a Storage: `File.type` se è un video, altrimenti
 * dedotto dall'estensione. Null = non lo riconosciamo come video.
 */
export function videoContentType(fileName: string, fileType: string): string | null {
  const t = fileType.trim().toLowerCase();
  if (t.startsWith("video/")) return t;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXT_MIME[ext] ?? null;
}

/** Validazione lato client, prima dell'upload. Null = file ok. */
export function videoFileError(file: {
  name: string;
  size: number;
  type: string;
}): string | null {
  if (!videoContentType(file.name, file.type))
    return `Formato non supportato. Carica un file video (${VIDEO_EXT_LABEL}).`;
  if (file.size <= 0) return "File vuoto o illeggibile.";
  if (file.size > VIDEO_MAX_BYTES)
    return `Video troppo grande (${videoMb(file.size)} MB): il limite è ${VIDEO_MAX_MB} MB. Ritaglia la gara o riduci la qualità.`;
  return null;
}

/** Validazione lato server sui metadati dell'oggetto già su Storage. */
export function videoObjectError(object: {
  size: number;
  mimetype: string;
}): string | null {
  if (!object.mimetype.toLowerCase().startsWith("video/"))
    return `Il file caricato non è un video (${VIDEO_EXT_LABEL}).`;
  if (object.size > VIDEO_MAX_BYTES)
    return `Video troppo grande (${videoMb(object.size)} MB): il limite è ${VIDEO_MAX_MB} MB.`;
  return null;
}
