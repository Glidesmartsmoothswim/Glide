import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALGO_VERSION,
  WEEKLY_TARGET,
  computeOnda,
  computeGlideScore,
  isoWeek,
  type Dimensions,
} from "./index";

export type ScoreResult = {
  onda: number;
  dims: Dimensions;
  score: number;
  frozen: boolean;
  weeksWithData: number;
  ready: boolean; // dati sufficienti per mostrare il Glide Score
  insufficient: (keyof Dimensions)[]; // dimensioni stimate su pochi dati
  algoVersion: number;
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/** Ultime N chiavi settimana ISO, dalla più vecchia alla più recente. */
function lastWeeks(n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--)
    out.push(isoWeek(new Date(Date.now() - i * 7 * 86_400_000)));
  return out;
}

/**
 * Calcola Onda + 5 dimensioni + Glide Score per un nuotatore, leggendo il
 * ledger (`activity_events`) e le viste di efficienza. `prevScore` è l'ultimo
 * score salvato (per l'inerzia ±3). `db` può essere il client utente (vista
 * propria) o admin (cron).
 */
export async function computeScore(
  db: SupabaseClient,
  swimmerId: string,
  prevScore: number | null,
): Promise<ScoreResult> {
  const insufficient: (keyof Dimensions)[] = [];

  // Pausa (infortunio/malattia) → score congelato.
  const { data: prof } = await db
    .from("profiles")
    .select("status")
    .eq("id", swimmerId)
    .maybeSingle();
  const status = (prof?.status ?? "attivo").toLowerCase();
  const frozen = !["attivo", "active", ""].includes(status);

  // Eventi ledger ultime 12 settimane.
  const cutoff = new Date(Date.now() - 12 * 7 * 86_400_000).toISOString();
  const { data: events } = await db
    .from("activity_events")
    .select("type, occurred_at")
    .eq("user_id", swimmerId)
    .gte("occurred_at", cutoff)
    .in("type", ["readiness.pre", "readiness.post", "video.uploaded"]);

  const postByWeek: Record<string, number> = {};
  let pre4 = 0,
    post4 = 0,
    video4 = 0;
  const fourWeeksAgo = Date.now() - 4 * 7 * 86_400_000;
  const weeksSet = new Set<string>();
  for (const e of events ?? []) {
    const when = new Date(e.occurred_at);
    if (e.type === "readiness.post") {
      const w = isoWeek(when);
      postByWeek[w] = (postByWeek[w] ?? 0) + 1;
      weeksSet.add(w);
      if (when.getTime() >= fourWeeksAgo) post4++;
    } else if (e.type === "readiness.pre" && when.getTime() >= fourWeeksAgo) {
      pre4++;
    } else if (
      e.type === "video.uploaded" &&
      when.getTime() >= fourWeeksAgo
    ) {
      video4++;
    }
  }

  // Onda: aderenza settimanale (ultime 8 settimane).
  const weekly = lastWeeks(8).map((w) => (postByWeek[w] ?? 0) / WEEKLY_TARGET);
  const onda = computeOnda(weekly);

  // Costanza: completate/previste su 4 settimane.
  const completed4 = lastWeeks(4).reduce(
    (s, w) => s + (postByWeek[w] ?? 0),
    0,
  );
  const costanza = clamp((completed4 / (WEEKLY_TARGET * 4)) * 100, 0, 100);

  // Aderenza: pre+post appaiati (+ piccolo bonus video).
  let aderenza: number;
  if (post4 === 0) {
    aderenza = 50;
    insufficient.push("aderenza");
  } else {
    const paired = Math.min(pre4, post4) / Math.max(pre4, post4);
    aderenza = clamp(paired * 90 + (video4 > 0 ? 10 : 0), 0, 100);
  }

  // Qualità + Miglioramento dalla curva di efficienza (finestra 8 sett. nella vista).
  const { data: eff } = await db
    .from("v_efficiency_points")
    .select("main_set_sig, rpe, created_at")
    .eq("swimmer_id", swimmerId)
    .order("created_at");
  const points = (eff ?? []).filter((p) => p.main_set_sig && p.rpe != null);

  // Qualità: RPE dentro la banda della zona prescritta.
  const { data: bands } = await db
    .from("zone_rpe_bands")
    .select("zone, rpe_min, rpe_max");
  const bandByZone = Object.fromEntries(
    (bands ?? []).map((b) => [b.zone, b]),
  );
  let inBand = 0,
    bandTotal = 0;
  for (const p of points) {
    const zone = String(p.main_set_sig).split("|").pop()?.trim();
    const band = zone ? bandByZone[zone] : null;
    if (!band) continue;
    bandTotal++;
    if (p.rpe >= band.rpe_min && p.rpe <= band.rpe_max) inBand++;
  }
  let qualita: number;
  if (bandTotal < 3) {
    qualita = 50;
    insufficient.push("qualita");
  } else {
    qualita = clamp((inBand / bandTotal) * 100, 0, 100);
  }

  // Miglioramento: trend RPE (prima metà vs seconda metà) a parità di lavoro.
  let miglioramento: number;
  if (points.length < 6) {
    miglioramento = 50;
    insufficient.push("miglioramento");
  } else {
    const half = Math.floor(points.length / 2);
    const avg = (arr: typeof points) =>
      arr.reduce((s, p) => s + Number(p.rpe), 0) / arr.length;
    const early = avg(points.slice(0, half));
    const late = avg(points.slice(half));
    // RPE che scende = miglioramento (stesso lavoro, meno fatica).
    miglioramento = clamp(50 + (early - late) * 15, 0, 100);
  }

  const dims: Dimensions = {
    costanza: Math.round(costanza),
    continuita: onda,
    qualita: Math.round(qualita),
    aderenza: Math.round(aderenza),
    miglioramento: Math.round(miglioramento),
  };

  const score = computeGlideScore(dims, prevScore, frozen);
  const weeksWithData = weeksSet.size;

  return {
    onda,
    dims,
    score,
    frozen,
    weeksWithData,
    ready: weeksWithData >= 3,
    insufficient,
    algoVersion: ALGO_VERSION,
  };
}

/**
 * Calcola e SALVA lo score della settimana corrente (upsert), usando come
 * `prev` l'ultimo score salvato prima di questa settimana. Richiede admin.
 */
export async function computeAndStore(
  admin: SupabaseClient,
  swimmerId: string,
): Promise<ScoreResult> {
  const thisWeek = isoWeek(new Date());
  const { data: last } = await admin
    .from("glide_scores")
    .select("week, score")
    .eq("swimmer_id", swimmerId)
    .lt("week", thisWeek)
    .order("week", { ascending: false })
    .limit(1)
    .maybeSingle();

  const result = await computeScore(admin, swimmerId, last?.score ?? null);

  await admin.from("glide_scores").upsert(
    {
      swimmer_id: swimmerId,
      week: thisWeek,
      onda: result.onda,
      dims: result.dims,
      score: result.score,
      frozen: result.frozen,
      algo_version: result.algoVersion,
      computed_at: new Date().toISOString(),
    },
    { onConflict: "swimmer_id,week" },
  );
  return result;
}
