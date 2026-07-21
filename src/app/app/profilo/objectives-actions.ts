"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  OBJECTIVE_KINDS,
  OBJECTIVE_STATUSES,
  type ObjectiveKind,
  type ObjectiveStatus,
} from "@/lib/objectives";

export type ObjectiveState = { error?: string; info?: string };

/** Aggiunge un obiettivo (RLS: il nuotatore inserisce i propri). */
export async function addObjective(
  _prev: ObjectiveState,
  fd: FormData,
): Promise<ObjectiveState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };

  const title = String(fd.get("title") ?? "").trim();
  if (!title) return { error: "Scrivi il tuo obiettivo." };
  const rawKind = String(fd.get("kind") ?? "gara");
  const kind: ObjectiveKind = (OBJECTIVE_KINDS as readonly string[]).includes(
    rawKind,
  )
    ? (rawKind as ObjectiveKind)
    : "gara";
  const target_date = String(fd.get("target_date") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase.from("objectives").insert({
    swimmer_id: profile.id,
    title,
    kind,
    target_date,
  });
  if (error) return { error: error.message };

  revalidatePath("/app/profilo");
  return { info: "Obiettivo aggiunto." };
}

/** Cambia stato (raggiunto/archiviato/attivo). */
export async function setObjectiveStatus(id: string, status: ObjectiveStatus) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  if (!(OBJECTIVE_STATUSES as readonly string[]).includes(status)) return;
  const supabase = await createClient();
  await supabase
    .from("objectives")
    .update({ status })
    .eq("id", id)
    .eq("swimmer_id", profile.id);
  revalidatePath("/app/profilo");
}

/** Elimina un obiettivo. */
export async function deleteObjective(id: string) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const supabase = await createClient();
  await supabase
    .from("objectives")
    .delete()
    .eq("id", id)
    .eq("swimmer_id", profile.id);
  revalidatePath("/app/profilo");
}
