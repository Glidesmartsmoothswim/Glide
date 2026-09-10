// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

/** Onda 13.6 — Token lezione per gli 1:1 (1 lezione inclusa).
 *  Sprint C.1 (ADR-015) — esteso a group_lesson: redeemable_for distingue
 *  su cosa il token è spendibile (lezione privata o di gruppo). */

/**
 * Origine del token, come da `lesson_tokens_source_check`.
 * - `coach`   — regalo del coach (ADR-015).
 * - `purchase` — pacchetto prepagato, emesso dal trigger (ADR-016).
 * - `mensile` — LEGACY: maturazione automatica con l'abbonamento, rimossa
 *   con migration_056 (GLIDE_DB_CHANGES_001 M4/M5). Nessuna riga nuova
 *   nasce così; il valore resta ammesso solo per lo storico già riscattato.
 */
export type TokenSource = "coach" | "purchase" | "mensile";
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
