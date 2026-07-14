/**
 * GLIDE — dominio allenamenti (zone/Franceschi).
 * Port fedele del parser shorthand e delle utility da glide-suite.jsx.
 *
 * Notazione riga, es:  8x50 SL @1'20" palette Z3
 *   reps x dist · stroke · @intervallo · attrezzi · Zx · (gambe/braccia) · note
 */

export type ZoneId = "Z1" | "Z2" | "Z3" | "Z4" | "Z5";

export const ZONES: Record<
  ZoneId,
  { label: string; desc: string; color: string; text: string; tint: string }
> = {
  Z1: { label: "Z1", desc: "Aerobico lento", color: "#CBD5E1", text: "#475569", tint: "#F1F5F9" },
  Z2: { label: "Z2", desc: "Aerobico", color: "#92D050", text: "#4B7A1E", tint: "#EEF7DF" },
  Z3: { label: "Z3", desc: "Soglia", color: "#FFF200", text: "#8A6D00", tint: "#FFFBDA" },
  Z4: { label: "Z4", desc: "Sovrasoglia · VO₂", color: "#FFC000", text: "#995C00", tint: "#FFF2D4" },
  Z5: { label: "Z5", desc: "Lattacido · gara", color: "#FF0000", text: "#B00000", tint: "#FEE7E7" },
};

export const STROKES: Record<string, string> = {
  SL: "Stile",
  DS: "Dorso",
  RA: "Rana",
  DF: "Delfino",
  MX: "Misti",
};

export const EQUIP: Record<string, string> = {
  pinne: "Pinne",
  palette: "Palette",
  pull: "Pull",
  tavoletta: "Tavoletta",
  boccaglio: "Boccaglio",
  laccio: "Laccio",
};

const EQ_SYN: Record<string, string> = { paddle: "palette", snorkel: "boccaglio" };

export type ParsedLine = {
  reps: number;
  dist: number;
  stroke: string;
  mode: "completo" | "gambe" | "braccia";
  zone: ZoneId | null;
  interval: number | null;
  equip: string[];
  note: string;
  raw: string;
};

/** Interpreta un intervallo tipo @1'20", @45", @1' → secondi. */
export function parseTime(raw: string): number | null {
  const t = raw.replace(/^@/, "");
  let m: RegExpMatchArray | null;
  if ((m = t.match(/^(\d{1,2})[:'’](\d{2})(?:''|"|”|’’)?$/))) return +m[1] * 60 + +m[2];
  if ((m = t.match(/^(\d{1,2})['’]$/))) return +m[1] * 60;
  if ((m = t.match(/^(\d{1,3})(?:''|"|”|’’)$/))) return +m[1];
  if (raw.startsWith("@") && (m = t.match(/^(\d{1,3})$/))) return +m[1];
  return null;
}

/** Interpreta una riga di allenamento in forma strutturata. */
export function parseLine(raw: string): ParsedLine {
  const line: ParsedLine = {
    reps: 1,
    dist: 0,
    stroke: "SL",
    mode: "completo",
    zone: null,
    interval: null,
    equip: [],
    note: "",
    raw: raw.trim(),
  };
  const notes: string[] = [];
  let gotDist = false;

  for (const tk of raw.trim().split(/\s+/).filter(Boolean)) {
    const tl = tk.toLowerCase();
    let m: RegExpMatchArray | null;
    if ((m = tk.match(/^(\d+)x(\d+)$/i))) {
      line.reps = +m[1];
      line.dist = +m[2];
      gotDist = true;
      continue;
    }
    if (STROKES[tk.toUpperCase()]) {
      line.stroke = tk.toUpperCase();
      continue;
    }
    if (tl === "gambe") {
      line.mode = "gambe";
      continue;
    }
    if (tl === "braccia") {
      line.mode = "braccia";
      continue;
    }
    if (/^z[1-5]$/i.test(tk)) {
      line.zone = ("Z" + tk[1]) as ZoneId;
      continue;
    }
    const iv = parseTime(tk);
    if (iv != null) {
      line.interval = iv;
      continue;
    }
    const ek = EQ_SYN[tl] || tl;
    if (EQUIP[ek]) {
      if (!line.equip.includes(ek)) line.equip.push(ek);
      continue;
    }
    if (!gotDist && (m = tk.match(/^(\d+)$/))) {
      line.dist = +m[1];
      line.reps = 1;
      gotDist = true;
      continue;
    }
    notes.push(tk);
  }
  line.note = notes.join(" ");
  return line;
}

/** Secondi → "1'20\"" / "45\"" / "2'". */
export const fmtTime = (s: number | null): string =>
  s == null
    ? ""
    : s < 60
      ? `${s}"`
      : s % 60 === 0
        ? `${s / 60}'`
        : `${Math.floor(s / 60)}'${(s % 60).toString().padStart(2, "0")}"`;

export type Block = { z: ZoneId; name: string; rounds: number; lines: string[] };

export const blockMeters = (b: Block): number =>
  b.rounds *
  b.lines.reduce((s, l) => {
    const p = parseLine(l);
    return s + p.reps * p.dist;
  }, 0);

export const woMeters = (blocks: Block[]): number =>
  blocks.reduce((s, b) => s + blockMeters(b), 0);

export const euro = (n: number): string =>
  "€ " + Number(n).toLocaleString("it-IT");

/** Etichetta leggibile di una riga, es "8×50 Stile @1'20\" · palette · Z3". */
export function lineLabel(raw: string): string {
  const p = parseLine(raw);
  const bits: string[] = [];
  bits.push(p.reps > 1 ? `${p.reps}×${p.dist}` : `${p.dist}`);
  bits.push(STROKES[p.stroke] ?? p.stroke);
  if (p.mode !== "completo") bits.push(p.mode);
  if (p.interval != null) bits.push("@" + fmtTime(p.interval));
  if (p.equip.length) bits.push(p.equip.map((e) => EQUIP[e]).join(" · "));
  if (p.note) bits.push(p.note);
  return bits.join(" · ");
}

const zoneRank = (z: string) => Number(z[1]) || 0;

/**
 * Firma del SET PRINCIPALE di un allenamento → "STILE|DISTANZA|INTERVALLO_SEC|ZONA"
 * (es. "SL|100|100|Z3"). Serve a confrontare l'RPE a parità di prescrizione
 * (Curva di efficienza). Blocco principale = zona più alta; riga = prima con
 * distanza > 0. Se non riconoscibile: null (e avanti, GLIDE_QUESTIONARIO §6).
 */
export function mainSetSig(blocks: Block[]): string | null {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;
  const main = blocks.reduce((best, b) =>
    zoneRank(b.z) > zoneRank(best.z) ? b : best,
  );
  for (const raw of main.lines) {
    const p = parseLine(raw);
    if (p.dist > 0) {
      const zone = p.zone ?? main.z;
      return `${p.stroke}|${p.dist}|${p.interval ?? 0}|${zone}`;
    }
  }
  return null;
}

/** "SL|100|100|Z3" → "100 SL @1'40\" Z3" (per l'etichetta della curva). */
export function sigLabel(sig: string): string {
  const [stroke, dist, ivl, zone] = sig.split("|");
  const iv = Number(ivl);
  const parts = [`${dist} ${STROKES[stroke] ?? stroke}`];
  if (iv > 0) parts.push("@" + fmtTime(iv));
  if (zone) parts.push(zone);
  return parts.join(" ");
}
