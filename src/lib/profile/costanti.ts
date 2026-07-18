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
