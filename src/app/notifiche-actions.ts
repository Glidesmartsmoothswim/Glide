"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

/** Segna una notifica come letta (RLS: propria o coach). */
export async function markRead(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("notifications").update({ read: true }).eq("id", id);
  revalidatePath("/coach/notifiche");
  revalidatePath("/app");
}

/** Segna tutte le proprie notifiche come lette. */
export async function markAllRead() {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", profile.id)
    .eq("read", false);
  revalidatePath("/coach/notifiche");
  revalidatePath("/app");
}
