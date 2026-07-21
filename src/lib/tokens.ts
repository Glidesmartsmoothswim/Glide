/** Onda 13.6 — Token lezione per gli 1:1 (1 lezione inclusa). */

export type TokenSource = "mensile" | "coach";

export type LessonTokenRow = {
  id: string;
  swimmer_id: string;
  source: TokenSource;
  granted_at: string;
  expires_at: string | null;
  redeemed_at: string | null;
  redeemed_booking_id: string | null;
  note: string | null;
};

/** Token spendibile: non riscattato e non scaduto. */
export function isTokenAvailable(t: LessonTokenRow, now = Date.now()): boolean {
  if (t.redeemed_at) return false;
  if (t.expires_at && new Date(t.expires_at).getTime() <= now) return false;
  return true;
}

/** Quanti token disponibili nella lista. */
export function availableCount(tokens: LessonTokenRow[]): number {
  return tokens.filter((t) => isTokenAvailable(t)).length;
}
