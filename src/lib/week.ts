/**
 * Utilità settimana Canale Open (Onda 12.3). Lunedì come riferimento,
 * coerente con `date_trunc('week', …)` di Postgres (settimana lun–dom).
 */
import { WEEK_DAYS, type WeekDay } from "@/lib/types";

/** Lunedì della settimana di `d`, come 'YYYY-MM-DD' (UTC-safe). */
export function mondayOf(d: Date = new Date()): string {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = (x.getUTCDay() + 6) % 7; // 0 = lunedì
  x.setUTCDate(x.getUTCDate() - dow);
  return x.toISOString().slice(0, 10);
}

/** Lunedì della settimana corrente. */
export function currentMonday(): string {
  return mondayOf(new Date());
}

/** Normalizza una data 'YYYY-MM-DD' al suo lunedì; null se vuota/non valida. */
export function normalizeToMonday(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = new Date(raw + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return null;
  return mondayOf(d);
}

/**
 * Giorno della settimana (Lun..Dom) di `d` (bugfix week_start/week_day —
 * i workout 'personal'/'self' non hanno un selettore giorno in editor: qui
 * deriviamo lo stesso giorno reale, con la stessa convenzione lun=0 usata
 * da `mondayOf`, non un valore a piacere).
 */
export function weekDayOf(d: Date = new Date()): WeekDay {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = (x.getUTCDay() + 6) % 7; // 0 = lunedì, stessa convenzione di mondayOf
  return WEEK_DAYS[dow];
}

const MESI = [
  "gen", "feb", "mar", "apr", "mag", "giu",
  "lug", "ago", "set", "ott", "nov", "dic",
];

/** Etichetta leggibile: "settimana del 21 lug". */
export function formatWeek(weekStart: string | null): string {
  if (!weekStart) return "Senza settimana";
  const d = new Date(weekStart + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) return "Senza settimana";
  return `settimana del ${d.getUTCDate()} ${MESI[d.getUTCMonth()]}`;
}

/** true se `weekStart` è la settimana corrente. */
export function isCurrentWeek(weekStart: string | null): boolean {
  return !!weekStart && weekStart === currentMonday();
}
