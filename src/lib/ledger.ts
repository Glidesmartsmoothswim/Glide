import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Ledger append-only `activity_events` (ADR-003 / migration_001).
 * Vocabolario chiuso. Regole payload (ADR-004):
 *  - MAI testo libero del nuotatore → solo `has_note` boolean.
 *  - MAI le sedi del dolore → solo `health_flag` boolean.
 *  - MAI valori derivati (XP, Glide Score): si calcolano a valle.
 */
export type EventType =
  | "workout.completed"
  | "readiness.pre"
  | "readiness.post"
  | "video.uploaded"
  | "race.logged"
  | "booking.created"
  | "booking.completed"
  | "booking.cancelled"
  | "booking.no_show"
  | "event.signup"
  | "videoanalisi.done";

/**
 * Scrive un evento. FAIL-SOFT: un errore del ledger non deve MAI far fallire
 * l'azione principale (un check-in, un upload). Append-only per costruzione.
 */
export async function logEvent(
  supabase: SupabaseClient,
  userId: string,
  type: EventType,
  payload: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase
      .from("activity_events")
      .insert({ user_id: userId, type, payload });
  } catch {
    /* silenzioso: il ledger non blocca il flusso */
  }
}
