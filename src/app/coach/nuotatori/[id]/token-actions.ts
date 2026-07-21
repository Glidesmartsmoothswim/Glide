"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

/** Il coach regala un token (non scade). Onda 13.6. */
export async function giftToken(swimmerId: string, note: string) {
  await requireRole("coach");
  const supabase = await createClient();
  const { error } = await supabase.from("lesson_tokens").insert({
    swimmer_id: swimmerId,
    source: "coach",
    expires_at: null,
    note: note.trim() || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/coach/nuotatori/${swimmerId}`);
  return { info: "Token regalato." };
}
