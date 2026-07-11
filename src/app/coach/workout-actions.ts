"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { woMeters, type Block } from "@/lib/workout";
import type { WorkoutFormState } from "@/components/workout/editor";

function parseBlocks(raw: string): Block[] {
  try {
    const b = JSON.parse(raw);
    return Array.isArray(b) ? b : [];
  } catch {
    return [];
  }
}

/** Scheda personale 1:1 → workouts(kind='personal', swimmer_id). */
export async function savePersonalWorkout(
  _prev: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const coach = await requireRole("coach");
  const swimmerId = String(formData.get("swimmer_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!swimmerId) return { error: "Nuotatore mancante." };
  if (!title) return { error: "Serve un titolo." };

  const blocks = parseBlocks(String(formData.get("blocks") ?? "[]"));
  const supabase = await createClient();
  const { error } = await supabase.from("workouts").insert({
    coach_id: coach.id,
    swimmer_id: swimmerId,
    kind: "personal",
    title,
    focus: String(formData.get("focus") ?? "").trim() || null,
    pool: Number(formData.get("pool") ?? 25),
    blocks,
    total_meters: woMeters(blocks),
  });
  if (error) return { error: error.message };

  revalidatePath(`/coach/nuotatori/${swimmerId}`);
  return { info: "Scheda salvata." };
}

/** Canale Open → workouts(kind='open_channel', week_day, visibile a tutti). */
export async function saveOpenWorkout(
  _prev: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const coach = await requireRole("coach");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Serve un titolo." };

  const blocks = parseBlocks(String(formData.get("blocks") ?? "[]"));
  const supabase = await createClient();
  const { error } = await supabase.from("workouts").insert({
    coach_id: coach.id,
    swimmer_id: null,
    kind: "open_channel",
    title,
    focus: String(formData.get("focus") ?? "").trim() || null,
    pool: Number(formData.get("pool") ?? 25),
    week_day: String(formData.get("week_day") ?? "Lun"),
    blocks,
    total_meters: woMeters(blocks),
    published_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath("/coach/open");
  revalidatePath("/app/nuoto");
  return { info: "Pubblicato sul Canale Open." };
}
