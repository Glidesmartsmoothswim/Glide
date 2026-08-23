"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { canAccess } from "@/lib/access";
import { woMeters, parseLine, type Block, type ZoneId } from "@/lib/workout";

export type SelfWorkoutState = { error?: string; info?: string; id?: string };

const MAX_LINES = 40;

/** Zona del blocco = la più frequente tra le righe scritte; fallback Z2. */
function pickBlockZone(lines: string[]): ZoneId {
  const tally: Partial<Record<ZoneId, number>> = {};
  for (const l of lines) {
    const z = parseLine(l).zone;
    if (z) tally[z] = (tally[z] ?? 0) + 1;
  }
  let best: ZoneId = "Z2";
  let bestCount = 0;
  for (const [z, n] of Object.entries(tally)) {
    if (n! > bestCount) {
      best = z as ZoneId;
      bestCount = n!;
    }
  }
  return best;
}

function parseLines(raw: string): { lines: string[]; error?: string } {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { lines, error: "Scrivi almeno una riga." };
  if (lines.length > MAX_LINES)
    return { lines, error: `Troppe righe (max ${MAX_LINES}).` };
  return { lines };
}

/**
 * Onda 29.5 (ADR-012) — Il nuotatore (tier Open/Open+) scrive il PROPRIO
 * allenamento con lo stesso shorthand del coach (riusa parseLine). NON è
 * l'editor del coach: un blocco solo, nessun picker zone/attrezzi — la zona
 * si legge dalle righe stesse (stesso token "Z3"/"NM" che il coach scrive).
 *
 * kind='self': mai nel Canale Open pubblico (le query lì filtrano
 * kind='open_channel'), mai un update diretto su un workout altrui (RLS
 * migration_037, scoped a swimmer_id = auth.uid()). coach_id è NOT NULL sullo
 * schema (modello single-coach, ADR-002): risolto qui via admin — MAI
 * hardcoded lato client (ADR-002 regola 1).
 */
async function resolveCoachId(): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "coach")
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function createSelfWorkout(
  _prev: SelfWorkoutState,
  fd: FormData,
): Promise<SelfWorkoutState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta, rientra." };
  if (!canAccess(profile.tier, "open:self"))
    return { error: "Il builder è incluso nei piani Open e Open+." };

  const title = String(fd.get("title") ?? "").trim();
  if (!title) return { error: "Serve un titolo." };
  const { lines, error: lineErr } = parseLines(String(fd.get("lines") ?? ""));
  if (lineErr) return { error: lineErr };
  const pool = Number(fd.get("pool") ?? 25) === 50 ? 50 : 25;

  const coachId = await resolveCoachId();
  if (!coachId) return { error: "Configurazione mancante, riprova più tardi." };

  const block: Block = { z: pickBlockZone(lines), name: title, rounds: 1, lines };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      coach_id: coachId,
      swimmer_id: profile.id,
      kind: "self",
      title,
      pool,
      blocks: [block],
      total_meters: woMeters([block]),
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/app/nuoto");
  return { info: "Salvato.", id: data?.id as string };
}

export async function updateSelfWorkout(
  _prev: SelfWorkoutState,
  fd: FormData,
): Promise<SelfWorkoutState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta, rientra." };

  const id = String(fd.get("id") ?? "");
  const title = String(fd.get("title") ?? "").trim();
  if (!id) return { error: "Allenamento non valido." };
  if (!title) return { error: "Serve un titolo." };
  const { lines, error: lineErr } = parseLines(String(fd.get("lines") ?? ""));
  if (lineErr) return { error: lineErr };
  const pool = Number(fd.get("pool") ?? 25) === 50 ? 50 : 25;

  const block: Block = { z: pickBlockZone(lines), name: title, rounds: 1, lines };
  const supabase = await createClient();
  // RLS (migration_037) già limita l'update a kind='self' AND swimmer_id =
  // auth.uid(): i filtri qui sotto sono ridondanti ma espliciti, coerenti
  // col resto del codice (mai fidarsi solo della RLS come unica riga letta).
  const { error } = await supabase
    .from("workouts")
    .update({
      title,
      pool,
      blocks: [block],
      total_meters: woMeters([block]),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("swimmer_id", profile.id)
    .eq("kind", "self");
  if (error) return { error: error.message };

  revalidatePath("/app/nuoto");
  revalidatePath(`/app/nuoto/${id}`);
  return { info: "Aggiornato.", id };
}

export async function deleteSelfWorkout(id: string): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const supabase = await createClient();
  await supabase
    .from("workouts")
    .delete()
    .eq("id", id)
    .eq("swimmer_id", profile.id)
    .eq("kind", "self");
  revalidatePath("/app/nuoto");
}
