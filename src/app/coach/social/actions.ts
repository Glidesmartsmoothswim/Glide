"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { Pillar, PostType, Channel, PostStatus } from "@/lib/social";

export type PostState = { error?: string; info?: string };

/** Crea un post nel planner (RLS: solo coach). */
export async function createPost(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const coach = await requireRole("coach");
  const caption = String(formData.get("caption") ?? "").trim();
  if (!caption) return { error: "Scrivi una caption." };

  const scheduledAt = String(formData.get("scheduled_at") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.from("social_posts").insert({
    coach_id: coach.id,
    pillar: (String(formData.get("pillar") ?? "consigli") as Pillar) || null,
    post_type: (String(formData.get("post_type") ?? "design") as PostType) || null,
    channel: (String(formData.get("channel") ?? "instagram") as Channel) || null,
    status: scheduledAt ? "scheduled" : "draft",
    scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    caption,
  });
  if (error) return { error: error.message };

  revalidatePath("/coach/social");
  return { info: "Post aggiunto al planner." };
}

/** Cambia lo stato di un post (draft → scheduled → published). */
export async function setPostStatus(formData: FormData) {
  await requireRole("coach");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as PostStatus;
  if (!id || !status) return;
  const supabase = await createClient();
  await supabase.from("social_posts").update({ status }).eq("id", id);
  revalidatePath("/coach/social");
}
