/** Vocabolario condiviso del profilo atleta (dichiarato, non calcolato). */

export const STILI = ["SL", "DS", "RA", "DF", "MX"] as const;
export type Stile = (typeof STILI)[number];

export const STILE_LABEL: Record<Stile, string> = {
  SL: "Stile libero",
  DS: "Dorso",
  RA: "Rana",
  DF: "Delfino",
  MX: "Misti",
};

/** Distanze per i personal best (metri). */
export const DISTANZE_PB = [50, 100, 200, 400, 800, 1500] as const;
export type DistanzaPb = (typeof DISTANZE_PB)[number];

/**
 * Programma gare INDIVIDUALE (staffette escluse): distanze ufficiali per stile.
 * SL 50→1500; dorso/rana/delfino 50/100/200; misti 100/200/400
 * (il 100 misti si nuota SOLO in vasca corta, 25 m).
 */
export const EVENTI_INDIVIDUALI: Record<Stile, number[]> = {
  SL: [50, 100, 200, 400, 800, 1500],
  DS: [50, 100, 200],
  RA: [50, 100, 200],
  DF: [50, 100, 200],
  MX: [100, 200, 400],
};

/** Distanze valide per (stile, vasca). Il 100 misti esiste solo in vasca 25. */
export function distanzeValide(stile: Stile, vasca: string): number[] {
  const base = EVENTI_INDIVIDUALI[stile];
  if (stile === "MX" && vasca === "50") return base.filter((d) => d !== 100);
  return base;
}

/** Vero se (stile, distanza, vasca) è una gara individuale ufficiale. */
export function isEventoIndividuale(
  stile: string,
  distanza: number,
  vasca: string,
): boolean {
  if (!isStile(stile) || !isVasca(vasca)) return false;
  return distanzeValide(stile, vasca).includes(distanza);
}

/** Distanze "abituali" dichiarate (include il fondo/acque libere). */
export const DISTANZE_ABITUALI = [
  "50",
  "100",
  "200",
  "400",
  "800",
  "1500",
  "Fondo",
] as const;

export const VASCHE = ["25", "50"] as const;
export type Vasca = (typeof VASCHE)[number];

export function isStile(v: string): v is Stile {
  return (STILI as readonly string[]).includes(v);
}
export function isVasca(v: string): v is Vasca {
  return (VASCHE as readonly string[]).includes(v);
}
