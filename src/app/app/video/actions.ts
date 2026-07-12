"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { serverFeatures } from "@/lib/flags";
import { createBirraCheckout } from "@/lib/stripe-checkout";
import { BIRRA_CENTS } from "@/lib/video";
import { notifyCoaches } from "@/lib/notify";
import { fullName } from "@/lib/types";

export type VideoState = { error?: string; info?: string };

/**
 * Registra un video già caricato su Storage.
 * tier dedotto dal servizio: 1:1/both → analisi inclusa (pending, paid);
 * Open → 'locked' finché non paga i €5.
 */
export async function registerVideo(
  _prev: VideoState,
  formData: FormData,
): Promise<VideoState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };

  const event = String(formData.get("event") ?? "").trim();
  const storagePath = String(formData.get("storage_path") ?? "").trim();
  const raceDate = String(formData.get("race_date") ?? "").trim() || null;
  if (!event) return { error: "Indica la gara (es. 50 SL — Regionali)." };
  if (!storagePath) return { error: "Carica prima il file video." };

  // Servizio → tier
  const { data: full } = await (await createClient())
    .from("profiles")
    .select("service_type")
    .eq("id", profile.id)
    .single();
  const is11 = full?.service_type === "coaching_1_1" || full?.service_type === "both";
  const tier = is11 ? "coaching_1_1" : "open";

  const supabase = await createClient();
  const { error } = await supabase.from("race_videos").insert({
    swimmer_id: profile.id,
    event,
    race_date: raceDate,
    storage_path: storagePath,
    tier,
    status: is11 ? "pending" : "locked",
    paid: is11,
  });
  if (error) return { error: error.message };

  await notifyCoaches(
    "video",
    "Nuovo video gara",
    `${fullName(profile)} — ${event}`,
  );

  revalidatePath("/app/video");
  revalidatePath("/coach/video");
  return {
    info: is11
      ? "Video inviato al coach — analisi inclusa."
      : "Video caricato. Sblocca l'analisi con una birra 🍺.",
  };
}

/**
 * Sblocca un video Open.
 * - Stripe attivo → redirect al checkout €5 (il webhook sbloccherà).
 * - Stripe assente → sblocco SIMULATO via service_role (bypassa la RLS,
 *   come farebbe il webhook) + transazione fittizia. Nessun crash.
 */
export async function unlockVideo(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const videoId = String(formData.get("video_id") ?? "");
  if (!videoId) return;

  if (serverFeatures().stripe) {
    const url = await createBirraCheckout({
      videoId,
      swimmerId: profile.id,
    });
    if (url) redirect(url);
  }

  // Modalità simulata
  const admin = createAdminClient();
  if (!admin) return;
  await admin
    .from("race_videos")
    .update({ paid: true, status: "pending" })
    .eq("id", videoId)
    .eq("swimmer_id", profile.id);
  await admin.from("transactions").insert({
    swimmer_id: profile.id,
    type: "birra",
    video_id: videoId,
    amount_cents: BIRRA_CENTS,
    currency: "eur",
    status: "succeeded",
    description: "Sblocco analisi video (simulato)",
  });
  await notifyCoaches(
    "birra",
    "🍺 Video sbloccato",
    `${fullName(profile)} ha sbloccato l'analisi (€5)`,
  );
  revalidatePath("/app/video");
  revalidatePath("/coach/video");
}
