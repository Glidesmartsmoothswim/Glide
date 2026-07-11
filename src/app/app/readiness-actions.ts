"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export type ReadinessState = { error?: string; info?: string };

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Check-in PRE (sonno/fatica/dolori/umore/motivazione 1–5). */
export async function savePre(
  _prev: ReadinessState,
  formData: FormData,
): Promise<ReadinessState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };

  const num = (k: string) => clamp(Number(formData.get(k) ?? 0), 1, 5);
  const row = {
    swimmer_id: profile.id,
    phase: "pre" as const,
    sleep: num("sleep"),
    fatigue: num("fatigue"),
    soreness: num("soreness"),
    mood: num("mood"),
    motivation: num("motivation"),
  };
  if (
    !row.sleep ||
    !row.fatigue ||
    !row.soreness ||
    !row.mood ||
    !row.motivation
  )
    return { error: "Valuta tutte le voci da 1 a 5." };

  const supabase = await createClient();
  const { error } = await supabase.from("readiness").insert(row);
  if (error) return { error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/progressi");
  return { info: "Readiness registrata — buona vasca!" };
}

/** Check-in POST (RPE 1–10 + nota). */
export async function savePost(
  _prev: ReadinessState,
  formData: FormData,
): Promise<ReadinessState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };

  const rpe = clamp(Number(formData.get("rpe") ?? 0), 1, 10);
  if (!rpe) return { error: "Indica lo sforzo percepito (RPE)." };

  const supabase = await createClient();
  const { error } = await supabase.from("readiness").insert({
    swimmer_id: profile.id,
    phase: "post",
    rpe,
    note: String(formData.get("note") ?? "").trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/progressi");
  return { info: "Sessione registrata. Onda dopo onda." };
}
