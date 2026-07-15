/**
 * Motore della scaletta videoanalisi — PURO e DETERMINISTICO.
 * Non è "AI": è aritmetica. Il coach resta l'unico a decidere l'ordine
 * (via `position`); qui si calcolano solo gli orari, riempiendo le corsie.
 */

export interface Participant {
  signupId: string;
  name: string;
  testDurations: number[]; // minuti dei test scelti
  position: number; // ordine deciso dal coach
}

export interface EventCfg {
  windowStart: Date;
  windowEnd: Date;
  lanes: number;
  setupMin: number; // reset telecamera / cambio atleta
  warmupLeadMin: number; // quanto prima entra a scaldare
}

export interface RunRow {
  signupId: string;
  name: string;
  position: number;
  lane: number;
  durationMin: number;
  warmupAt: Date;
  testAt: Date;
  outAt: Date;
}

export interface RunsheetResult {
  rows: RunRow[];
  finish: Date;
  overrun: number; // minuti oltre windowEnd (>0 = sforo)
}

const MIN = 60_000;

export function buildRunsheet(
  ps: Participant[],
  cfg: EventCfg,
): RunsheetResult {
  const lanes = Math.max(1, cfg.lanes);
  const laneClock = Array<number>(lanes).fill(cfg.windowStart.getTime());
  const rows: RunRow[] = [];

  const sorted = [...ps].sort((a, b) => a.position - b.position);
  let position = 0;
  for (const p of sorted) {
    position++;
    const dur = p.testDurations.reduce((a, b) => a + b, 0) + cfg.setupMin;

    // corsia che si libera prima → riempimento naturale
    let lane = 0;
    for (let i = 1; i < laneClock.length; i++)
      if (laneClock[i] < laneClock[lane]) lane = i;

    const testAt = laneClock[lane];
    const outAt = testAt + dur * MIN;
    const warmupAt = Math.max(
      cfg.windowStart.getTime(),
      testAt - cfg.warmupLeadMin * MIN,
    );

    rows.push({
      signupId: p.signupId,
      name: p.name,
      position,
      lane: lane + 1,
      durationMin: dur,
      warmupAt: new Date(warmupAt),
      testAt: new Date(testAt),
      outAt: new Date(outAt),
    });
    laneClock[lane] = outAt;
  }

  const finishMs = Math.max(...laneClock);
  const overrun = Math.round((finishMs - cfg.windowEnd.getTime()) / MIN);
  return { rows, finish: new Date(finishMs), overrun };
}

/** Capienza stimata: quanti nuotatori entrano date finestra, corsie, pacchetto medio. */
export function estimateCapacity(
  windowMinutes: number,
  lanes: number,
  avgPackageMin: number,
): number {
  if (avgPackageMin <= 0) return 0;
  return Math.floor((windowMinutes * Math.max(1, lanes)) / avgPackageMin);
}

export type CapacityLevel = "green" | "yellow" | "red";

/** Semaforo di capienza dal valore di sforo (minuti). */
export function capacityLevel(overrun: number): CapacityLevel {
  if (overrun < -30) return "green";
  if (overrun <= 0) return "yellow";
  return "red";
}
