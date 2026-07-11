"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export type CommentState = { error?: string; info?: string };

/** Il coach aggiunge un commento/analisi a un video (RLS: solo coach). */
export async function addComment(
  _prev: CommentState,
  formData: FormData,
): Promise<CommentState> {
  const coach = await requireRole("coach");
  const videoId = String(formData.get("video_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!videoId || !body) return { error: "Scrivi un commento." };

  const supabase = await createClient();
  const { error } = await supabase.from("video_comments").insert({
    video_id: videoId,
    coach_id: coach.id,
    body,
  });
  if (error) return { error: error.message };

  // Passa lo stato a 'reviewed' e assegna il coach.
  await supabase
    .from("race_videos")
    .update({ status: "reviewed", coach_id: coach.id })
    .eq("id", videoId);

  revalidatePath("/coach/video");
  revalidatePath("/app/video");
  return { info: "Analisi inviata." };
}

/** Segna un video come analizzato senza commento testuale. */
export async function markReviewed(formData: FormData) {
  const coach = await requireRole("coach");
  const videoId = String(formData.get("video_id") ?? "");
  if (!videoId) return;
  const supabase = await createClient();
  await supabase
    .from("race_videos")
    .update({ status: "reviewed", coach_id: coach.id })
    .eq("id", videoId);
  revalidatePath("/coach/video");
  revalidatePath("/app/video");
}
