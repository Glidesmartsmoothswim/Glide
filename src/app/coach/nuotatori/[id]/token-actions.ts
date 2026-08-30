"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import type { TokenRedeemableFor } from "@/lib/tokens";

/** Il coach regala un token (non scade). Onda 13.6, esteso a group_lesson
 *  (ADR-015 Sprint C.1 — videoanalisi_event resta fuori scope). */
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
  return {
    info:
      redeemableFor === "group_lesson"
        ? "Token gruppo regalato."
        : "Token regalato.",
  };
}
