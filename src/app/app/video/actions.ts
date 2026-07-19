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
import { logEvent } from "@/lib/ledger";
import { RETENTION } from "@/lib/retention";
import { fullName } from "@/lib/types";

export type VideoState = { error?: string; info?: string };

/** Legge un video se l'utente può vederlo (RLS: proprio o coach). */
async function fetchOwnedVideo(videoId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { profile: null, video: null };
  const supabase = await createClient();
  const { data: video } = await supabase
    .from("race_videos")
    .select("id, swimmer_id, storage_path, deleted_at, retention_state")
    .eq("id", videoId)
    .maybeSingle();
  return { profile, video };
}

/**
 * Soft delete di un video (nuotatore sul proprio, coach su quelli dei suoi):
 * `deleted_at = now()`, sparisce da ogni vista; "Annulla" per 7 giorni.
 * Il FILE non si tocca ora — lo rimuove il purge dopo la finestra.
 * I commenti del coach NON si cancellano. Ledger: video.deleted.
 */
export async function softDeleteVideo(videoId: string): Promise<VideoState> {
  const { profile, video } = await fetchOwnedVideo(videoId);
  if (!profile) return { error: "Sessione scaduta." };
  if (!video) return { error: "Video non trovato." };

  const admin = createAdminClient();
  if (!admin) return { error: "Storage non configurato." };

  const { count } = await admin
    .from("video_comments")
    .select("id", { count: "exact", head: true })
    .eq("video_id", videoId);
  const hadAnalysis = (count ?? 0) > 0;

  await admin
    .from("race_videos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", videoId);

  await logEvent(admin, video.swimmer_id as string, "video.deleted", {
    video_id: videoId,
    by: profile.role === "coach" ? "coach" : "swimmer",
    had_analysis: hadAnalysis,
  });

  revalidatePath("/app/video");
  revalidatePath("/coach/video");
  return { info: "Video eliminato. Puoi annullare entro 7 giorni." };
}

/** Annulla la cancellazione entro la finestra di grazia (7 giorni). */
export async function undoDeleteVideo(videoId: string): Promise<VideoState> {
  const { profile, video } = await fetchOwnedVideo(videoId);
  if (!profile) return { error: "Sessione scaduta." };
  if (!video?.deleted_at) return { error: "Nulla da annullare." };

  const graceMs = RETENTION.softDeleteGraceDays * 24 * 60 * 60 * 1000;
  if (Date.now() - new Date(video.deleted_at as string).getTime() > graceMs)
    return { error: "Finestra scaduta: il video non è più recuperabile." };

  const admin = createAdminClient();
  if (!admin) return { error: "Storage non configurato." };
  await admin
    .from("race_videos")
    .update({ deleted_at: null })
    .eq("id", videoId);

  revalidatePath("/app/video");
  revalidatePath("/coach/video");
  return { info: "Cancellazione annullata." };
}

/** Preserva ✦ / rimuovi preserva (max 3 per nuotatore). */
export async function togglePreserve(videoId: string): Promise<VideoState> {
  const { profile, video } = await fetchOwnedVideo(videoId);
  if (!profile) return { error: "Sessione scaduta." };
  if (!video) return { error: "Video non trovato." };

  const admin = createAdminClient();
  if (!admin) return { error: "Storage non configurato." };

  if (video.retention_state === "preserved") {
    await admin
      .from("race_videos")
      .update({ retention_state: "active" })
      .eq("id", videoId);
    revalidatePath("/app/video");
    return { info: "Preserva rimosso." };
  }

  const { count } = await admin
    .from("race_videos")
    .select("id", { count: "exact", head: true })
    .eq("swimmer_id", video.swimmer_id as string)
    .eq("retention_state", "preserved");
  if ((count ?? 0) >= RETENTION.maxPreserved)
    return {
      error: `Massimo ${RETENTION.maxPreserved} video preservati. Togline uno prima.`,
    };

  await admin
    .from("race_videos")
    .update({ retention_state: "preserved" })
    .eq("id", videoId);
  revalidatePath("/app/video");
  return { info: "Video preservato ✦." };
}

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
  const { data: inserted, error } = await supabase
    .from("race_videos")
    .insert({
      swimmer_id: profile.id,
      event,
      race_date: raceDate,
      storage_path: storagePath,
      tier,
      status: is11 ? "pending" : "locked",
      paid: is11,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  await logEvent(supabase, profile.id, "video.uploaded", {
    video_id: inserted?.id ?? null,
  });

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
