/** Configurazione condivisa (UI + server). */

/** Finestra entro cui un allenamento pubblicato resta modificabile. */
export const WORKOUT_EDIT_WINDOW_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Timestamp (ms) entro cui l'allenamento è modificabile, o null se ignoto. */
export function workoutEditableUntil(
  publishedAt: string | null | undefined,
  createdAt?: string | null,
): number | null {
  const base = publishedAt ?? createdAt ?? null;
  if (!base) return null;
  const t = new Date(base).getTime();
  if (Number.isNaN(t)) return null;
  return t + WORKOUT_EDIT_WINDOW_DAYS * DAY_MS;
}

/** true se l'allenamento è ancora modificabile (entro la finestra). */
export function canEditWorkout(
  publishedAt: string | null | undefined,
  createdAt?: string | null,
  now: number = Date.now(),
): boolean {
  const until = workoutEditableUntil(publishedAt, createdAt);
  return until !== null && now <= until;
}
