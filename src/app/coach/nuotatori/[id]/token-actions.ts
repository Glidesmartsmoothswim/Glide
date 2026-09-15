"use server";
// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { TokenRedeemableFor } from "@/lib/tokens";

/** Il coach regala un token. Onda 13.6, esteso a group_lesson
 *  (ADR-015 Sprint C.1 — videoanalisi_event resta fuori scope) e a call
 *  (migration_064: è così che un pacchetto prevede i check-in da remoto).
 *
 *  I token lezione non scadono: sono regali, e un regalo non ha una data.
 *  Il check-in da remoto invece fa parte del pacchetto stagionale, quindi
 *  scade con la stagione — `tier_expires_at` del nuotatore. Un check-in
 *  compreso in una stagione che vale anche dopo sarebbe una stagione che non
 *  finisce mai. */
export async function giftToken(
  swimmerId: string,
  note: string,
  redeemableFor: TokenRedeemableFor = "private_lesson",
) {
  await requireRole("coach");
  const supabase = await createClient();

  let expiresAt: string | null = null;
  if (redeemableFor === "call") {
    const { data: p } = await supabase
      .from("profiles")
      .select("tier_expires_at")
      .eq("id", swimmerId)
      .maybeSingle();
    // Senza scadenza dell'abbonamento non c'è una stagione a cui agganciarlo:
    // il token nasce senza data, e resta una scelta visibile, non un default
    // nascosto (l'esito qui sotto lo dice).
    expiresAt = (p?.tier_expires_at as string | null) ?? null;
  }

  const { error } = await supabase.from("lesson_tokens").insert({
    swimmer_id: swimmerId,
    source: "coach",
    redeemable_for: redeemableFor,
    expires_at: expiresAt,
    note: note.trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/coach/nuotatori/${swimmerId}`);
  if (redeemableFor === "call")
    return {
      info: expiresAt
        ? `Check-in da remoto aggiunto · scade con la stagione, il ${new Intl.DateTimeFormat(
            "it-IT",
            { timeZone: "Europe/Rome", day: "numeric", month: "long", year: "numeric" },
          ).format(new Date(expiresAt))}.`
        : "Check-in da remoto aggiunto · senza scadenza: il nuotatore non ha una stagione con data di fine.",
    };
  return {
    info:
      redeemableFor === "group_lesson"
        ? "Token gruppo regalato."
        : "Token regalato.",
  };
}
