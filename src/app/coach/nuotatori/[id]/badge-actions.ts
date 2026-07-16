"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";

/**
 * Conferimento badge dal coach (GLIDE_GAMIFICATION §5): il giudizio umano è
 * la merce rara. `awarded_by` = il coach; una notifica avvisa il nuotatore.
 */
export async function awardBadge(fd: FormData): Promise<void> {
  const coach = await getCurrentProfile();
  if (!coach || coach.role !== "coach") return;
  const swimmerId = String(fd.get("swimmer_id") ?? "");
  const code = String(fd.get("badge_code") ?? "");
  const note = String(fd.get("note") ?? "").trim() || null;
  if (!swimmerId || !code) return;

  const supabase = await createClient();
  await supabase.from("swimmer_badges").upsert(
    { swimmer_id: swimmerId, badge_code: code, awarded_by: coach.id, note },
    { onConflict: "swimmer_id,badge_code" },
  );

  const { data: badge } = await supabase
    .from("badges")
    .select("name, emoji")
    .eq("code", code)
    .maybeSingle();
  await notifyUser(
    swimmerId,
    "open",
    `${badge?.emoji ?? "🏅"} ${badge?.name ?? "Nuovo badge"}`,
    note ?? "Alessio ti ha conferito un badge.",
  );

  revalidatePath(`/coach/nuotatori/${swimmerId}`);
}

export async function revokeBadge(fd: FormData): Promise<void> {
  const coach = await getCurrentProfile();
  if (!coach || coach.role !== "coach") return;
  const swimmerId = String(fd.get("swimmer_id") ?? "");
  const code = String(fd.get("badge_code") ?? "");
  if (!swimmerId || !code) return;

  const supabase = await createClient();
  await supabase
    .from("swimmer_badges")
    .delete()
    .eq("swimmer_id", swimmerId)
    .eq("badge_code", code);
  revalidatePath(`/coach/nuotatori/${swimmerId}`);
}
