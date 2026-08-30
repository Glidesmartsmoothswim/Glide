// SSOT colori zona per i grafici. Derivato da `lib/workout.ts` (ZONES/ZoneId),
// la palette REALE già in uso nei chip zona dell'editor/workout-hand (Onda
// 29.1) — non da glide-suite.jsx: quel file di riferimento non esiste più in
// questo repo (solo un prototipo storico citato in README).
//
// Deviazione dal prompt sorgente (VINCOLO §2 stesso — "nessun colore nuovo,
// riusala"): il colore NM specificato lì (#94A3B8, slate) non è quello
// realmente in uso — la produzione ha NM = #7C3AED (viola, vedi
// lib/workout.ts ZONES.NM). Per non introdurre un secondo NM diverso nella
// stessa app (l'errore che il VINCOLO vuole evitare), questo file DERIVA i
// colori da ZONES invece di ridichiararli: non possono più divergere.
//
// Z1-Z5 coincidono già esattamente col prompt sorgente (verificato).

import { ZONES, type ZoneId } from "./workout";

export type ZonaBucket = ZoneId;

export const ZONE_COLOR: Record<ZonaBucket, string> = Object.fromEntries(
  (Object.keys(ZONES) as ZonaBucket[]).map((z) => [z, ZONES[z].color]),
) as Record<ZonaBucket, string>;

export const ZONE_LABEL: Record<ZonaBucket, string> = {
  Z1: "Z1", Z2: "Z2", Z3: "Z3", Z4: "Z4", Z5: "Z5", NM: "NM",
};

// Impilamento barra: dall'alto in basso.
export const ORDINE_BARRA: ZonaBucket[] = ["NM", "Z5", "Z4", "Z3", "Z2", "Z1"];
