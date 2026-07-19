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
