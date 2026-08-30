/** Onda 13.6 — Token lezione per gli 1:1 (1 lezione inclusa).
 *  Sprint C.1 (ADR-015) — esteso a group_lesson: redeemable_for distingue
 *  su cosa il token è spendibile (lezione privata o di gruppo). */

export type TokenSource = "mensile" | "coach";
export type TokenRedeemableFor = "private_lesson" | "group_lesson";

export type LessonTokenRow = {
  id: string;
  swimmer_id: string;
  source: TokenSource;
  redeemable_for: TokenRedeemableFor;
  granted_at: string;
  expires_at: string | null;
  redeemed_at: string | null;
  redeemed_booking_id: string | null;
  note: string | null;
};

type Redeemability = Pick<LessonTokenRow, "redeemed_at" | "expires_at">;
type Typed = Pick<LessonTokenRow, "redeemable_for">;

/** Token spendibile: non riscattato e non scaduto. */
export function isTokenAvailable(t: Redeemability, now = Date.now()): boolean {
  if (t.redeemed_at) return false;
  if (t.expires_at && new Date(t.expires_at).getTime() <= now) return false;
  return true;
}

/** Quanti token disponibili nella lista (tutti i tipi). */
export function availableCount(tokens: Redeemability[]): number {
  return tokens.filter((t) => isTokenAvailable(t)).length;
}

/** Quanti token disponibili nella lista, per tipo (private_lesson/group_lesson). */
export function availableCountByType(
  tokens: (Redeemability & Typed)[],
): Record<TokenRedeemableFor, number> {
  const out: Record<TokenRedeemableFor, number> = {
    private_lesson: 0,
    group_lesson: 0,
  };
  for (const t of tokens) if (isTokenAvailable(t)) out[t.redeemable_for]++;
  return out;
}
