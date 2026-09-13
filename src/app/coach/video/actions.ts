"use server";
// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";
import { birraPriceCents } from "@/lib/birra";
import { reportPaymentWriteError } from "@/lib/payment/errors";

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
  const { data: video } = await supabase
    .from("race_videos")
    .update({ status: "reviewed", coach_id: coach.id })
    .eq("id", videoId)
    .select("swimmer_id, event")
    .single();

  if (video?.swimmer_id) {
    await notifyUser(
      video.swimmer_id,
      "video",
      "Analisi pronta 🎬",
      `Il coach ha commentato ${video.event ?? "la tua gara"}`,
    );
  }

  revalidatePath("/coach/video");
  revalidatePath("/app/video");
  return { info: "Analisi inviata." };
}

/**
 * Colletta per la Birra — partita aperta (migration_061, A4.1).
 *
 * Sostituisce `unlockPaidVideo`, che era un cancello: il video restava
 * `locked` finché il coach non confermava l'incasso di 5 €. Adesso il video
 * si lavora sempre; la colletta si annota e si salda col rinnovo successivo.
 *
 * `segnaBirraDovuta` non blocca niente ed è idempotente per video: due click
 * non fanno due debiti.
 */
export async function segnaBirraDovuta(formData: FormData) {
  await requireRole("coach");
  const videoId = String(formData.get("video_id") ?? "") || null;
  const swimmerId = String(formData.get("swimmer_id") ?? "");
  if (!swimmerId) return;

  const supabase = await createClient();

  if (videoId) {
    const { data: gia } = await supabase
      .from("birra_tab")
      .select("id")
      .eq("video_id", videoId)
      .maybeSingle();
    if (gia) return; // già segnata: non se ne apre una seconda
  }

  const amount = await birraPriceCents(supabase);
  const { error } = await supabase.from("birra_tab").insert({
    swimmer_id: swimmerId,
    video_id: videoId,
    amount_cents: amount,
    state: "dovuta",
  });
  if (error)
    reportPaymentWriteError(error, { op: "segnaBirraDovuta", swimmerId });

  revalidatePath("/coach/video");
  revalidatePath(`/coach/nuotatori/${swimmerId}`);
}

/**
 * Chiude la partita: incassata. Nasce la transazione `type='birra'`, che è
 * ciò che Business e `v_monthly_revenue` contano a parte.
 */
export async function chiudiBirra(formData: FormData) {
  await requireRole("coach");
  const id = String(formData.get("birra_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: tab } = await supabase
    .from("birra_tab")
    .select("id, swimmer_id, video_id, amount_cents, state")
    .eq("id", id)
    .maybeSingle();
  if (!tab || tab.state !== "dovuta") return;

  // Prima il ricavo, poi la chiusura: se la transazione non passa, la partita
  // resta aperta e si riprova. Il contrario perderebbe l'incasso in silenzio —
  // è esattamente l'errore costato 1.301,90 € di ricavi invisibili (ADR-019).
  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .insert({
      swimmer_id: tab.swimmer_id,
      type: "birra",
      video_id: tab.video_id,
      amount_cents: tab.amount_cents,
      currency: "eur",
      status: "succeeded",
      description: "Colletta per la Birra — incassata col rinnovo",
    })
    .select("id")
    .single();
  if (txError) {
    reportPaymentWriteError(txError, {
      op: "chiudiBirra:transaction",
      swimmerId: tab.swimmer_id as string,
    });
    return;
  }

  await supabase
    .from("birra_tab")
    .update({
      state: "pagata",
      settled_at: new Date().toISOString(),
      transaction_id: tx?.id ?? null,
    })
    .eq("id", id)
    .eq("state", "dovuta");

  revalidatePath("/coach/video");
  revalidatePath("/coach/business");
  revalidatePath(`/coach/nuotatori/${tab.swimmer_id}`);
}

/**
 * Il coach offre la colletta. Caso DISTINTO da "incassata": nessun importo,
 * nessuna transazione. Se le due cose si confondessero, un omaggio finirebbe
 * nei ricavi e i conti tornerebbero solo per caso.
 */
export async function offriBirra(formData: FormData) {
  await requireRole("coach");
  const id = String(formData.get("birra_id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: tab } = await supabase
    .from("birra_tab")
    .update({ state: "offerta", settled_at: new Date().toISOString() })
    .eq("id", id)
    .eq("state", "dovuta")
    .select("swimmer_id")
    .maybeSingle();
  if (!tab) return;

  await notifyUser(
    tab.swimmer_id as string,
    "birra",
    "Offre il coach 🍺",
    "L'analisi di questa gara è offerta: nessuna colletta da saldare.",
  );
  revalidatePath("/coach/video");
  revalidatePath(`/coach/nuotatori/${tab.swimmer_id}`);
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
