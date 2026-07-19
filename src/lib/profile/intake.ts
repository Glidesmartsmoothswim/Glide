/** Vocabolario, tipi e motore livello dell'intake (agonista/libero). */

export type AthleteType = "agonista" | "libero";

export const ATHLETE_LABEL: Record<AthleteType, string> = {
  agonista: "Agonista",
  libero: "Libero",
};

/* ---- Blocco comune (§2) ---- */
export const OBIETTIVI = [
  "tecnica",
  "resistenza",
  "velocita",
  "forma",
  "gara",
  "benessere",
] as const;
export type Obiettivo = (typeof OBIETTIVI)[number];
export const OBIETTIVO_LABEL: Record<Obiettivo, string> = {
  tecnica: "Tecnica",
  resistenza: "Resistenza",
  velocita: "Velocità",
  forma: "Rimettermi in forma",
  gara: "Prepararmi a una gara",
  benessere: "Benessere / costanza",
};

export const FREQ = ["1", "2", "3", "4+"] as const;

/* ---- Percorso A · agonista (§3) ---- */
export const ANNI_NUOTO = ["<2", "2-5", "5+"] as const;
export const CONTINUITA = ["costante", "intermittente", "ripresa"] as const;
export const CONTINUITA_LABEL: Record<string, string> = {
  costante: "Costante",
  intermittente: "Intermittente",
  ripresa: "Ripresa dopo stop",
};

/* ---- Percorso B · libero (§4) ---- */
export const CORSI = ["mai", "bambino", "adulto", "sempre"] as const;
export const CORSI_LABEL: Record<string, string> = {
  mai: "Mai",
  bambino: "Da bambino / ragazzo",
  adulto: "Da adulto",
  sempre: "Nuoto da sempre",
};

/** Stili che il libero "sa nuotare" (no misti; + "nessuno con sicurezza"). */
export const STILI_SAI = ["SL", "DS", "RA", "DF"] as const;
export const STILE_SAI_LABEL: Record<string, string> = {
  SL: "Stile libero",
  DS: "Dorso",
  RA: "Rana",
  DF: "Delfino",
};
export const NESSUNO_STILE = "nessuno";

export const AUTOVAL_ANCORE: Record<number, string> = {
  1: "Faccio fatica a finire una vasca",
  2: "Nuoto ma mi stanco presto",
  3: "Me la cavo",
  4: "Nuoto bene",
  5: "Mi sento a casa",
};

export const AREE = [
  "respirazione",
  "tecnica",
  "resistenza",
  "sicurezza",
  "dimagrire",
  "stile_nuovo",
] as const;
export const AREE_LABEL: Record<string, string> = {
  respirazione: "Respirazione",
  tecnica: "Tecnica di uno stile",
  resistenza: "Resistenza",
  sicurezza: "Sicurezza in acqua",
  dimagrire: "Dimagrire nuotando",
  stile_nuovo: "Imparare uno stile nuovo",
};

export type IntakeRow = {
  user_id: string;
  goal_primary: string;
  goal_note: string | null;
  freq_settimanale: string;
  vasca: number;
  anni_nuoto: string | null;
  continuita: string | null;
  gare_12m: boolean | null;
  esperienza_intensita: boolean | null;
  device_fc: boolean | null;
  corsi: string | null;
  stili: string[] | null;
  autovalutazione: number | null;
  aree_miglioramento: string[] | null;
};

/* ---- Motore livello (deterministico, no AI) — SOLO percorso B (§4) ---- */
export type Livello = "Base" | "Intermedio" | "Avanzato";

/**
 * `level = f(corsi, stili, autovalutazione)` → Base / Intermedio / Avanzato.
 * Punteggio 0–6: corsi (0/1/2) + n. stili (0/1/2) + autovalutazione (0/1/2).
 * 0–2 Base · 3–4 Intermedio · 5–6 Avanzato. Visibile SOLO al coach (ADR-006 §4).
 */
export function livelloLibero(input: {
  corsi?: string | null;
  stili?: string[] | null;
  autovalutazione?: number | null;
}): Livello {
  let p = 0;
  if (input.corsi === "sempre") p += 2;
  else if (input.corsi === "adulto" || input.corsi === "bambino") p += 1;

  const nStili = (input.stili ?? []).filter((s) => s !== NESSUNO_STILE).length;
  if (nStili >= 3) p += 2;
  else if (nStili >= 1) p += 1;

  const a = input.autovalutazione ?? 0;
  if (a >= 4) p += 2;
  else if (a === 3) p += 1;

  return p >= 5 ? "Avanzato" : p >= 3 ? "Intermedio" : "Base";
}
