"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { woMeters, type Block } from "@/lib/workout";
import { canEditWorkout } from "@/lib/config";
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
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      coach_id: coach.id,
      swimmer_id: swimmerId,
      kind: "personal",
      title,
      focus: String(formData.get("focus") ?? "").trim() || null,
      pool: Number(formData.get("pool") ?? 25),
      blocks,
      total_meters: woMeters(blocks),
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath(`/coach/nuotatori/${swimmerId}`);
  return { info: "Salvato in scheda.", workoutId: data?.id as string };
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
  const { data, error } = await supabase
    .from("workouts")
    .insert({
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
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/coach/open");
  revalidatePath("/app/nuoto");
  return { info: "Pubblicato sul Canale Open.", workoutId: data?.id as string };
}

/**
 * Modifica di un allenamento pubblicato ENTRO la finestra (14 giorni).
 * La stessa finestra è imposta anche lato server: oltre → rifiuto.
 */
export async function updateWorkout(
  _prev: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const coach = await requireRole("coach");
  const id = String(formData.get("workout_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!id) return { error: "Allenamento mancante." };
  if (!title) return { error: "Serve un titolo." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("workouts")
    .select("published_at, created_at, kind, swimmer_id")
    .eq("id", id)
    .eq("coach_id", coach.id)
    .single();
  if (!existing) return { error: "Allenamento non trovato." };
  if (!canEditWorkout(existing.published_at, existing.created_at))
    return {
      error: "Non più modificabile (oltre 14 giorni dalla pubblicazione).",
    };

  const blocks = parseBlocks(String(formData.get("blocks") ?? "[]"));
  const patch: Record<string, unknown> = {
    title,
    focus: String(formData.get("focus") ?? "").trim() || null,
    pool: Number(formData.get("pool") ?? 25),
    blocks,
    total_meters: woMeters(blocks),
    updated_at: new Date().toISOString(),
  };
  if (existing.kind === "open_channel" && formData.get("week_day"))
    patch.week_day = String(formData.get("week_day"));

  const { error } = await supabase
    .from("workouts")
    .update(patch)
    .eq("id", id)
    .eq("coach_id", coach.id);
  if (error) return { error: error.message };

  if (existing.swimmer_id)
    revalidatePath(`/coach/nuotatori/${existing.swimmer_id}`);
  revalidatePath("/coach/open");
  revalidatePath("/app/nuoto");
  return { info: "Allenamento aggiornato.", workoutId: id };
}
