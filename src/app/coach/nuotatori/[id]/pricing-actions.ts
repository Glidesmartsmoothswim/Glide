"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

/** Coach — toggle "Affiliato" (sconto lezione di gruppo). Sprint C.3. */
export async function setGroupLessonAffiliate(swimmerId: string, value: boolean) {
  await requireRole("coach");
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ group_lesson_affiliate: value })
    .eq("id", swimmerId);
  if (error) return { error: error.message };
  revalidatePath(`/coach/nuotatori/${swimmerId}`);
  return { info: value ? "Affiliato." : "Non più affiliato." };
}

/** Coach — override discrezionale del prezzo "lezione extra" (in euro,
 *  convertito e salvato in centesimi). `null`/vuoto rimuove l'override. */
export async function setExtraLessonPriceOverride(
  swimmerId: string,
  euros: number | null,
) {
  await requireRole("coach");
  const cents =
    euros == null || Number.isNaN(euros) ? null : Math.round(euros * 100);
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ extra_lesson_price_override_cents: cents })
    .eq("id", swimmerId);
  if (error) return { error: error.message };
  revalidatePath(`/coach/nuotatori/${swimmerId}`);
  return { info: cents == null ? "Override rimosso." : "Prezzo salvato." };
}
