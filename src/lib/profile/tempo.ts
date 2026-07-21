/**
 * Tempi di nuoto in CENTESIMI di secondo (interi).
 * Sotto il minuto si mostra "SS.CC" (es. 32.45), dal minuto in su "M:SS.CC"
 * (es. 1:05.32, 16:04.99).
 */

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Da centesimi totali → stringa formattata. */
export function formatTempo(cc: number): string {
  const t = Math.max(0, Math.round(cc));
  const min = Math.floor(t / 6000);
  const sec = Math.floor((t % 6000) / 100);
  const cent = t % 100;
  return min > 0 ? `${min}:${pad2(sec)}.${pad2(cent)}` : `${sec}.${pad2(cent)}`;
}

/** Da centesimi → campi separati min/sec/cent, per pre-riempire un form. */
export function splitTempo(cc: number): {
  min: string;
  sec: string;
  cent: string;
} {
  const t = Math.max(0, Math.round(cc));
  const min = Math.floor(t / 6000);
  const sec = Math.floor((t % 6000) / 100);
  const cent = t % 100;
  return {
    min: min ? String(min) : "",
    sec: String(sec),
    cent: pad2(cent),
  };
}

/** true se il valore è un intero (accetta anche stringhe numeriche). */
function asInt(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isInteger(n)) return null;
  return n;
}

/**
 * Da campi separati min/sec/cent → centesimi totali.
 * Ritorna null se un campo non è valido (sec 0-59, cent 0-99, no negativi)
 * o se il tempo totale è 0 (nessun tempo inserito).
 */
export function parseTempo(
  min: string | number | null | undefined,
  sec: string | number | null | undefined,
  cent: string | number | null | undefined,
): number | null {
  const m = asInt(min);
  const s = asInt(sec);
  const c = asInt(cent);
  if (m === null || s === null || c === null) return null;
  if (m < 0 || s < 0 || s > 59 || c < 0 || c > 99) return null;
  const total = m * 6000 + s * 100 + c;
  return total > 0 ? total : null;
}
