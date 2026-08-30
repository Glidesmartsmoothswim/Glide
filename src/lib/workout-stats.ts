/**
 * Statistiche zona/carico per i grafici (Torta + CurvaCarico).
 *
 * Deviazione dal prompt sorgente: qui NON si reimplementa un parser riga
 * (`parseLine`/`lineMeters` locali) — si importa direttamente `blockMeters`
 * da `lib/workout.ts`, lo stesso già usato da editor.tsx, workout-actions.ts,
 * self-actions.ts e readiness-actions.ts per calcolare i metri. Il prompt
 * sorgente chiedeva un parser "estratto... perché deve restare identica: se
 * diverge, editor e grafici raccontano metri diversi" — l'unico modo che lo
 * garantisce PER SEMPRE (non solo al momento della copia) è non duplicarlo.
 *
 * La zona è SEMPRE quella del blocco (`block.z`) — verificato contro 3
 * workout reali in produzione: tutti usano `z`, mai `zone` (vedi STATO.md).
 * Le sigle zona dentro le singole `lines` sono rumore di formattazione del
 * coach: `blockMeters`/`parseLine` le leggono solo per calcolare i metri
 * della riga, mai per riclassificare la zona del blocco.
 */

import { blockMeters, type Block } from "./workout";
import { ZonaBucket, ZONE_COLOR, ZONE_LABEL } from "./chart-tokens";

export interface WorkoutForStats {
  id: string;
  week_start: string | null;
  blocks: Block[];
}

/** Metri per zona di una singola seduta. */
export function distribuzioneWorkout(
  blocks: Block[],
): Partial<Record<ZonaBucket, number>> {
  const acc: Partial<Record<ZonaBucket, number>> = {};
  for (const b of blocks) {
    if (!b.z) continue; // blocco senza zona assegnata: escluso, mai stimato
    acc[b.z] = (acc[b.z] ?? 0) + blockMeters(b);
  }
  return acc;
}

/** Aggrega N workout per settimana (week_start già in colonna, nessun calcolo di calendario qui). */
export function buildSettimane(workouts: WorkoutForStats[]) {
  const map = new Map<string, Partial<Record<ZonaBucket, number>>>();
  for (const w of workouts) {
    if (!w.week_start) continue;
    const dist = distribuzioneWorkout(w.blocks);
    const cur = map.get(w.week_start) ?? {};
    for (const [z, v] of Object.entries(dist)) {
      const zb = z as ZonaBucket;
      cur[zb] = (cur[zb] ?? 0) + (v ?? 0);
    }
    map.set(w.week_start, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, volumi]) => ({ iso, volumi }));
}

/** Converte una distribuzione in Fetta[] pronte per <Torta>. */
export function toFette(dist: Partial<Record<ZonaBucket, number>>) {
  return (Object.entries(dist) as [ZonaBucket, number][])
    .filter(([, v]) => v > 0)
    .map(([z, v]) => ({ label: ZONE_LABEL[z], value: v, color: ZONE_COLOR[z] }));
}
