import { PAYMENT_GATE } from "./config";

/**
 * ADR-014 — gate ad accesso a degrado progressivo. Calcolato SOLO a
 * lettura, a partire da `tier_expires_at`: mai un cron che stacca
 * l'accesso da solo (vincolo esplicito dell'ADR).
 *
 * - `ok`      — nessuna scadenza impostata, o scadenza non ancora raggiunta.
 * - `due`     — è il giorno della scadenza.
 * - `grace`   — 1..graceDays giorni dopo: accesso INVARIATO (banner + digest).
 * - `overdue` — oltre graceDays giorni: niente nuovo programma/prenotazioni.
 *               Storico e readiness restano SEMPRE visibili — il degrado
 *               colpisce l'erogazione, mai i dati dell'atleta.
 */
export type GateState = "ok" | "due" | "grace" | "overdue";

const DAY = 24 * 60 * 60 * 1000;

export function gateState(
  tierExpiresAt: string | null | undefined,
  now = new Date(),
): GateState {
  if (!tierExpiresAt) return "ok";
  const exp = new Date(tierExpiresAt).getTime();
  if (Number.isNaN(exp)) return "ok";
  const daysPast = Math.floor((now.getTime() - exp) / DAY);
  if (daysPast < 0) return "ok";
  if (daysPast === 0) return "due";
  if (daysPast <= PAYMENT_GATE.graceDays) return "grace";
  return "overdue";
}

/** Giorni di ritardo (0 se non ancora scaduto). Usato dal digest/UI. */
export function daysOverdue(
  tierExpiresAt: string | null | undefined,
  now = new Date(),
): number {
  if (!tierExpiresAt) return 0;
  const exp = new Date(tierExpiresAt).getTime();
  if (Number.isNaN(exp)) return 0;
  return Math.max(0, Math.floor((now.getTime() - exp) / DAY));
}

/**
 * Tier "effettivo" per il gating (lib/access.ts, booking): se l'abbonamento
 * è overdue, si comporta come free per l'erogazione di NUOVO contenuto —
 * l'override del coach (tier_expires_at spostato avanti) lo riattiva subito
 * in ogni momento. Non tocca mai l'archivio/readiness, che non passano da
 * qui (ownership, non tier — vedi access.ts).
 */
export function effectiveTier<T extends string>(
  tier: T,
  tierExpiresAt: string | null | undefined,
  freeTier: T,
  now = new Date(),
): T {
  return gateState(tierExpiresAt, now) === "overdue" ? freeTier : tier;
}
