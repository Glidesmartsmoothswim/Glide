/**
 * Onda + Glide Score — funzioni PURE (GLIDE_GAMIFICATION §3-4, ADR-005).
 *
 * Principi non negoziabili:
 *  - MAI la performance pura (un indice che scende perché invecchi è una
 *    macchina per disdette). Tutte le dimensioni sono migliorabili a 60 anni.
 *  - MAI un confronto con altri: tutto è auto-riferito.
 *  - L'Onda non si rompe mai e non ha stato "rosso": onda bassa = "acqua calma".
 *  - Il Glide Score si muove lentamente (±3/sett), si congela in Pausa, e si
 *    salva sempre con `algo_version` (la formula evolverà, lo storico deve
 *    restare leggibile).
 */

/** Versione dell'algoritmo. Incrementare quando cambiano pesi o formule. */
export const ALGO_VERSION = 1;

/** Sedute previste a settimana (baseline Master). Usata per l'aderenza. */
export const WEEKLY_TARGET = 3;

/** Massimo movimento del Glide Score in una settimana. */
export const MAX_WEEKLY_DELTA = 3;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/**
 * Onda: media mobile esponenziale dell'aderenza.
 *   onda(t) = onda(t-1)·0.75 + (completate/previste)·25   → clamp 0–100
 * `weeklyAdherence` è ordinata dalla più VECCHIA alla più RECENTE.
 */
export function computeOnda(weeklyAdherence: number[]): number {
  let onda = 0;
  for (const a of weeklyAdherence) {
    onda = onda * 0.75 + Math.max(0, a) * 25;
    onda = clamp(onda, 0, 100);
  }
  return Math.round(onda);
}

/** Etichetta gentile per l'Onda (mai colpevolizzante). */
export function ondaLabel(onda: number): string {
  if (onda >= 75) return "Onda lunga";
  if (onda >= 45) return "In movimento";
  if (onda >= 20) return "Si increspa";
  return "Acqua calma";
}

/** Le 5 dimensioni del Glide Score (0–100 ciascuna) e i pesi (§4). */
export type Dimensions = {
  costanza: number; // sedute completate/previste (rolling 4 sett.)
  continuita: number; // l'Onda
  qualita: number; // disciplina di zona (RPE in banda)
  aderenza: number; // check-in pre/post, video, feedback
  miglioramento: number; // trend curva di efficienza
};

export const WEIGHTS: Record<keyof Dimensions, number> = {
  costanza: 25,
  continuita: 20,
  qualita: 20,
  aderenza: 20,
  miglioramento: 15,
};

/** Media pesata grezza delle 5 dimensioni (0–100). */
export function rawScore(d: Dimensions): number {
  const total =
    d.costanza * WEIGHTS.costanza +
    d.continuita * WEIGHTS.continuita +
    d.qualita * WEIGHTS.qualita +
    d.aderenza * WEIGHTS.aderenza +
    d.miglioramento * WEIGHTS.miglioramento;
  const w =
    WEIGHTS.costanza +
    WEIGHTS.continuita +
    WEIGHTS.qualita +
    WEIGHTS.aderenza +
    WEIGHTS.miglioramento;
  return total / w;
}

/**
 * Glide Score settimanale con inerzia.
 *  - frozen (Pausa: infortunio/malattia) → resta al valore precedente.
 *  - altrimenti si muove al massimo di ±MAX_WEEKLY_DELTA verso il raw.
 * `prev` = ultimo score salvato (null alla prima volta).
 */
export function computeGlideScore(
  d: Dimensions,
  prev: number | null,
  frozen = false,
): number {
  const raw = rawScore(d);
  if (frozen && prev != null) return Math.round(prev);
  if (prev == null) return Math.round(raw);
  const delta = clamp(raw - prev, -MAX_WEEKLY_DELTA, MAX_WEEKLY_DELTA);
  return Math.round(clamp(prev + delta, 0, 100));
}

/** Chiave settimana ISO ("2026-W29") nel fuso Europe/Rome. */
export function isoWeek(date: Date): string {
  // Data locale di Roma → calcolo ISO week su UTC equivalente.
  const p: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date))
    p[part.type] = part.value;
  const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
  const day = d.getUTCDay() || 7; // lun=1..dom=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // giovedì della settimana
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
