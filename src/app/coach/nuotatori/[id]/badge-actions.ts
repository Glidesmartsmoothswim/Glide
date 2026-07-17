"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";

/**
 * Conferimento badge dal coach (FASE 6.1, ADR-005 §8-9).
 * - Motivazione OBBLIGATORIA, max 140 caratteri: è quella il premio.
 * - Nuotatore in pausa → niente badge, niente notifica. Silenzio rispettoso.
 * - Notifica sobria, senza emoji (registro adulto).
 */
export async function awardBadge(fd: FormData): Promise<void> {
  const coach = await getCurrentProfile();
  if (!coach || coach.role !== "coach") return;
  const swimmerId = String(fd.get("swimmer_id") ?? "");
  const code = String(fd.get("badge_code") ?? "");
  const note = String(fd.get("note") ?? "").trim().slice(0, 140);
  if (!swimmerId || !code || !note) return; // motivazione obbligatoria

  const supabase = await createClient();

  // ADR-005 §8: a un nuotatore in pausa non si conferisce nulla.
  const { data: sw } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", swimmerId)
    .maybeSingle();
  const paused = (sw?.status ?? "attivo").toLowerCase() !== "attivo";
  if (paused) return;

  await supabase.from("swimmer_badges").upsert(
    { swimmer_id: swimmerId, badge_code: code, awarded_by: coach.id, note },
    { onConflict: "swimmer_id,badge_code" },
  );

  const { data: badge } = await supabase
    .from("badges")
    .select("name")
    .eq("code", code)
    .maybeSingle();
  await notifyUser(
    swimmerId,
    "open",
    `Badge da Alessio: ${badge?.name ?? code}`,
    note,
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
