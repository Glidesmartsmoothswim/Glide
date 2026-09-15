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
/**
 * Su cosa è spendibile il token.
 * - `private_lesson` / `group_lesson` — lezioni in vasca (ADR-015).
 * - `call` — check-in da remoto compreso nel percorso (migration_064). La call
 *   non si compra da sola: il token È il modo in cui il pacchetto la prevede.
 */
export type TokenRedeemableFor = "private_lesson" | "group_lesson" | "call";

/**
 * Tipo di token che copre un servizio, dal suo codice. Sta qui e non nella UI
 * perché la stessa regola serve al client (quale saldo mostrare) e al server
 * (quale token riservare): in due posti diversi diventerebbero due regole.
 */
export function tokenTypeForService(code: string): TokenRedeemableFor {
  if (code.startsWith("group_")) return "group_lesson";
  if (code.startsWith("call_")) return "call";
  return "private_lesson";
}

/** Saldo a zero per ogni tipo: base comune a UI e conteggi. */
export function emptyTokenCount(): Record<TokenRedeemableFor, number> {
  return { private_lesson: 0, group_lesson: 0, call: 0 };
}

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

const GIORNO = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

/**
 * Riga dello storico token nel profilo del nuotatore.
 *
 * Dice la data della LEZIONE, non quella in cui il token è stato preso: sono
 * due giorni diversi quasi sempre — si prenota oggi per sabato — e la seconda
 * non significa niente per chi legge. Chi controlla i conti confronta queste
 * righe con le lezioni che ricorda di aver fatto, e con `redeemed_at` non
 * tornavano mai: un token «usato l'11/09» per una lezione nuotata il 12, un
 * altro «usato il 13/09» per una lezione ancora da fare il 19.
 *
 * Distingue anche l'impegnato dallo speso: finché la lezione non è arrivata il
 * token è prenotato, non consumato, e disdicendo in tempo torna indietro.
 */
export function tokenUsageLabel(
  t: Redeemability & { lessonStartsAt?: string | null },
  now: number = Date.now(),
): string {
  const lesson = t.lessonStartsAt ? new Date(t.lessonStartsAt).getTime() : NaN;
  if (!Number.isNaN(lesson))
    return lesson > now
      ? `Impegnato per la lezione di ${GIORNO.format(lesson)}`
      : `Usato per la lezione di ${GIORNO.format(lesson)}`;
  // Nessuna prenotazione agganciata (storico vecchio, o lezione cancellata a
  // mano): resta la data del riscatto, detta per quello che è.
  const redeemed = t.redeemed_at ? new Date(t.redeemed_at).getTime() : NaN;
  if (!Number.isNaN(redeemed)) return `Usato il ${GIORNO.format(redeemed)}`;
  return "Scaduto";
}

/**
 * Quanti token LEZIONE disponibili (privata + gruppo), esclusi i check-in da
 * remoto. È il saldo da mostrare dove si parla di lezioni e da confrontare con
 * i pacchetti acquistati, che call non ne contengono (migration_064).
 */
export function lessonTokenCount(tokens: (Redeemability & Typed)[]): number {
  const byType = availableCountByType(tokens);
  return byType.private_lesson + byType.group_lesson;
}

/** Quanti token disponibili nella lista, per tipo (private_lesson/group_lesson/call). */
export function availableCountByType(
  tokens: (Redeemability & Typed)[],
): Record<TokenRedeemableFor, number> {
  const out = emptyTokenCount();
  for (const t of tokens) if (isTokenAvailable(t)) out[t.redeemable_for]++;
  return out;
}
