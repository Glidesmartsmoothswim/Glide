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

/** Il coach regala un token (non scade). Onda 13.6, esteso a group_lesson
 *  (ADR-015 Sprint C.1 — videoanalisi_event resta fuori scope) e a call
 *  (migration_064: è così che un pacchetto prevede i check-in da remoto). */
export async function giftToken(
  swimmerId: string,
  note: string,
  redeemableFor: TokenRedeemableFor = "private_lesson",
) {
  await requireRole("coach");
  const supabase = await createClient();
  const { error } = await supabase.from("lesson_tokens").insert({
    swimmer_id: swimmerId,
    source: "coach",
    redeemable_for: redeemableFor,
    expires_at: null,
    note: note.trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/coach/nuotatori/${swimmerId}`);
  const INFO: Record<TokenRedeemableFor, string> = {
    private_lesson: "Token regalato.",
    group_lesson: "Token gruppo regalato.",
    call: "Check-in da remoto aggiunto.",
  };
  return { info: INFO[redeemableFor] };
}
