"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { isLeadSource, isLeadStage } from "@/lib/leads";

export type LeadState = { error?: string; info?: string };

/** Crea un lead (RLS: solo coach). */
export async function createLead(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const coach = await requireRole("coach");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Serve almeno il nome." };

  const source = String(formData.get("source") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({
    coach_id: coach.id,
    name,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    source: isLeadSource(source) ? source : null,
    note: String(formData.get("note") ?? "").trim() || null,
    stage: "nuovo",
  });
  if (error) return { error: error.message };

  revalidatePath("/coach/lead");
  return { info: "Lead aggiunto." };
}

/** Sposta un lead lungo l'imbuto (nuovo → contattato → convertito/perso). */
export async function setLeadStage(formData: FormData) {
  await requireRole("coach");
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  if (!id || !isLeadStage(stage)) return;
  const supabase = await createClient();
  await supabase.from("leads").update({ stage }).eq("id", id);
  revalidatePath("/coach/lead");
}

/** Rimuove un lead. */
export async function deleteLead(formData: FormData) {
  await requireRole("coach");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("leads").delete().eq("id", id);
  revalidatePath("/coach/lead");
}
