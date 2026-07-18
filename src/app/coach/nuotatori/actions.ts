"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { createSwimmerAccount } from "@/lib/coach/create-swimmer";
import type { ServiceType, SwimmerStatus, CertStatus } from "@/lib/types";

export type SwimmerActionState = {
  error?: string;
  info?: string;
  tempPassword?: string;
};

/** Aggiorna i campi anagrafici di un nuotatore (RLS: solo il coach). */
export async function updateSwimmer(
  _prev: SwimmerActionState,
  formData: FormData,
): Promise<SwimmerActionState> {
  await requireRole("coach");
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Nuotatore non valido." };

  const patch = {
    first_name: String(formData.get("first_name") ?? "").trim(),
    last_name: String(formData.get("last_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || null,
    service_type: String(formData.get("service_type") ?? "open") as ServiceType,
    level: String(formData.get("level") ?? "").trim() || null,
    package: String(formData.get("package") ?? "").trim() || null,
    status: String(formData.get("status") ?? "attivo") as SwimmerStatus,
    cert_status: String(formData.get("cert_status") ?? "assente") as CertStatus,
    cert_expiry: String(formData.get("cert_expiry") ?? "").trim() || null,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/coach/nuotatori/${id}`);
  revalidatePath("/coach/nuotatori");
  return { info: "Scheda aggiornata." };
}

/** Archivia un nuotatore (status='scaduto'): NON cancella dati. */
export async function archiveSwimmer(formData: FormData) {
  await requireRole("coach");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("profiles").update({ status: "scaduto" }).eq("id", id);
  revalidatePath("/coach/nuotatori");
  redirect("/coach/nuotatori");
}

/**
 * Crea un nuovo nuotatore (via helper condiviso): utente auth + profilo,
 * invito email o password temporanea in modalità simulata.
 */
export async function createSwimmer(
  _prev: SwimmerActionState,
  formData: FormData,
): Promise<SwimmerActionState> {
  await requireRole("coach");
  const res = await createSwimmerAccount({
    email: String(formData.get("email") ?? ""),
    firstName: String(formData.get("first_name") ?? "").trim(),
    lastName: String(formData.get("last_name") ?? "").trim(),
    serviceType: String(formData.get("service_type") ?? "open") as ServiceType,
  });
  if (res.swimmerId) revalidatePath("/coach/nuotatori");
  return {
    error: res.error,
    info: res.info,
    tempPassword: res.tempPassword,
  };
}
