/** Programmazione 1:1 (macro/mesocicli). Tipi, palette e validazioni. */

export type ProgramStatus = "draft" | "active" | "closed";

export const PHASE_TYPES = [
  "generale",
  "specifico",
  "gara",
  "tapering",
  "scarico",
  "transizione",
] as const;
export type PhaseType = (typeof PHASE_TYPES)[number];

export const PHASE_LABEL: Record<PhaseType, string> = {
  generale: "Generale",
  specifico: "Specifico",
  gara: "Gara",
  tapering: "Tapering",
  scarico: "Scarico",
  transizione: "Transizione",
};

/** Palette dai token brand esistenti (ADR-005: nessun colore nuovo, niente rosso). */
export const PHASE_COLOR: Record<PhaseType, string> = {
  generale: "var(--blu)",
  specifico: "var(--navy)",
  gara: "var(--turchese)",
  tapering: "var(--teal)",
  scarico: "var(--muted)",
  transizione: "var(--border)",
};

export type ProgramRow = {
  id: string;
  swimmer_id: string;
  coach_id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: ProgramStatus;
  goal_race_name: string | null;
  goal_race_date: string | null;
  goal_race_pool: number | null;
  goal_events: string[] | null;
  goal_time_target: string | null;
  created_at: string;
};

export type PhaseRow = {
  id: string;
  program_id: string;
  name: string;
  phase_type: PhaseType;
  start_date: string;
  end_date: string;
  focus: string | null;
};

export type PhaseInput = {
  name: string;
  phase_type: PhaseType;
  start_date: string;
  end_date: string;
  focus?: string | null;
};

const DAY = 24 * 60 * 60 * 1000;
const d = (s: string) => new Date(s + "T00:00:00Z").getTime();

/**
 * Valida le fasi (§3.3): dentro le date del programma, in sequenza, senza
 * sovrapposizioni e senza buchi (ogni fase inizia il giorno dopo la fine
 * della precedente). Ritorna un messaggio d'errore o null se ok.
 */
export function validatePhases(
  phases: PhaseInput[],
  program: { start_date: string; end_date: string },
): string | null {
  if (phases.length === 0) return null;
  for (const p of phases) {
    if (!p.name.trim()) return "Ogni fase deve avere un nome.";
    if (d(p.end_date) < d(p.start_date))
      return "Una fase finisce prima di iniziare.";
  }
  const sorted = [...phases].sort((a, b) => d(a.start_date) - d(b.start_date));
  if (d(sorted[0].start_date) < d(program.start_date))
    return "Una fase inizia prima del programma.";
  if (d(sorted[sorted.length - 1].end_date) > d(program.end_date))
    return "Una fase finisce dopo il programma.";
  for (let i = 1; i < sorted.length; i++) {
    const gap = d(sorted[i].start_date) - d(sorted[i - 1].end_date);
    if (gap <= 0) return "Due fasi si sovrappongono.";
    if (gap > DAY) return "C'è un buco tra due fasi.";
  }
  return null;
}

/** Fase attiva a una certa data (default: oggi). */
export function currentPhase(
  phases: PhaseRow[],
  now = Date.now(),
): PhaseRow | null {
  return (
    phases.find((p) => now >= d(p.start_date) && now <= d(p.end_date) + DAY) ??
    null
  );
}

/** Giorni alla gara (>=0) o null se non c'è data gara. */
export function daysToRace(goalRaceDate: string | null): number | null {
  if (!goalRaceDate) return null;
  const diff = Math.ceil((d(goalRaceDate) - Date.now()) / DAY);
  return diff;
}
