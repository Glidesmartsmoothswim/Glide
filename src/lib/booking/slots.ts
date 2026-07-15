/**
 * Slot engine — funzione PURA, usata sia lato server (validazione, verità)
 * sia lato client (griglia). Nessuna dipendenza, nessun I/O.
 *
 * Regole (glide-ext-booking §1):
 *  - "fine lavori": end_time è l'ultima FINE ammessa → ultima partenza = end − durata.
 *  - una prenotazione occupa [starts_at, block_until) = ends_at + buffer.
 *  - uno slot candidato [t, t+durata+buffer) che interseca un busy sparisce.
 *  - preavviso minimo: lo slot deve iniziare ≥ now + leadTimeHours.
 *
 * Timezone applicativa fissa: Europe/Rome. I calcoli di griglia sono in
 * minuti-del-giorno (wall clock); la conversione in istante assoluto avviene
 * ai bordi ed è DST-safe (doppio raffinamento dell'offset).
 */

export type Mode = "pool" | "remote";

export interface Rule {
  weekday: number; // 0=domenica … 6=sabato
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  step: number; // minuti
  modes: Mode[];
}

export interface Exception {
  kind: "closed" | "extra";
  start?: string; // "HH:MM"; per closed assente = giornata intera
  end?: string;
  modes: Mode[];
}

export interface Busy {
  start: Date;
  end: Date; // = block_until (buffer incluso) o fine evento bloccante
}

export interface SlotQuery {
  dateStr: string; // "YYYY-MM-DD" nel fuso Europe/Rome
  weekday: number; // weekday di dateStr in Europe/Rome (0=dom)
  durationMin: number; // 30 | 60
  bufferMin: number;
  mode: Mode;
  rules: Rule[];
  exceptions: Exception[];
  busy: Busy[];
  leadTimeHours: number; // default 12
  now: Date;
}

const TZ = "Europe/Rome";

/** Offset di Europe/Rome (ms) all'istante UTC dato: Rome = UTC + offset. */
function romeOffsetMs(atUtc: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(atUtc)) p[part.type] = part.value;
  const asUTC = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return asUTC - atUtc.getTime();
}

/** Converte un orario "muro" di Roma (dateStr + minuti) in istante UTC assoluto. */
export function romeWallToUtc(dateStr: string, minutesOfDay: number): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const wallAsUtc = Date.UTC(y, m - 1, d, 0, 0, 0) + minutesOfDay * 60_000;
  // Prima stima con l'offset all'istante "ingenuo", poi raffina (bordi DST).
  let off = romeOffsetMs(new Date(wallAsUtc));
  let utc = wallAsUtc - off;
  off = romeOffsetMs(new Date(utc));
  utc = wallAsUtc - off;
  return new Date(utc);
}

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

type Window = { start: number; end: number; step: number };

/** Interval subtraction in minuti: rimuove `cut` da `win`, splitta se serve. */
function subtract(win: Window, cutStart: number, cutEnd: number): Window[] {
  if (cutEnd <= win.start || cutStart >= win.end) return [win]; // niente overlap
  const out: Window[] = [];
  if (cutStart > win.start) out.push({ ...win, end: cutStart });
  if (cutEnd < win.end) out.push({ ...win, start: cutEnd });
  return out;
}

/** Regole del weekday + aperture extra − chiusure, filtrate per modalità. */
function resolveWindows(q: SlotQuery): Window[] {
  const wants = (modes: Mode[]) => modes.includes(q.mode);

  let windows: Window[] = q.rules
    .filter((r) => r.weekday === q.weekday && wants(r.modes))
    .map((r) => ({ start: toMin(r.start), end: toMin(r.end), step: r.step }));

  for (const ex of q.exceptions) {
    if (ex.kind === "extra" && wants(ex.modes) && ex.start && ex.end) {
      windows.push({ start: toMin(ex.start), end: toMin(ex.end), step: 15 });
    }
  }
  for (const ex of q.exceptions) {
    if (ex.kind !== "closed") continue;
    if (!ex.start || !ex.end) return []; // chiusura dell'intera giornata
    const cs = toMin(ex.start);
    const ce = toMin(ex.end);
    windows = windows.flatMap((w) => subtract(w, cs, ce));
  }
  return windows;
}

export function buildSlots(q: SlotQuery): Date[] {
  const windows = resolveWindows(q);
  const minStart = new Date(q.now.getTime() + q.leadTimeHours * 3_600_000);
  const seen = new Set<number>();
  const out: Date[] = [];

  for (const w of windows) {
    const lastStart = w.end - q.durationMin; // "fine lavori"
    for (let t = w.start; t <= lastStart; t += w.step) {
      const startUtc = romeWallToUtc(q.dateStr, t);
      if (startUtc < minStart) continue;
      const slotEnd = new Date(
        startUtc.getTime() + (q.durationMin + q.bufferMin) * 60_000,
      );
      const clash = q.busy.some(
        (b) => startUtc < b.end && slotEnd > b.start,
      );
      if (clash) continue;
      const key = startUtc.getTime();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(startUtc);
      }
    }
  }
  out.sort((a, b) => a.getTime() - b.getTime());
  return out;
}

/** weekday (0=dom) di una data "YYYY-MM-DD" letta nel fuso Europe/Rome. */
export function romeWeekday(dateStr: string): number {
  // mezzogiorno evita ambiguità DST ai bordi del giorno
  const noon = romeWallToUtc(dateStr, 12 * 60);
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
  }).format(noon);
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd] ?? 0;
}
