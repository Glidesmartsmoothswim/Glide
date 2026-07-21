"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { createSwimmerAccount } from "@/lib/coach/create-swimmer";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasOneToOne, grantMonthlyTokenIfMissing } from "@/lib/entitlements";
import { TIERS, type Tier } from "@/lib/access";
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

  // Onda 12.1: il coach assegna il tier. Guardia server oltre a quella DB
  // (il trigger consente il cambio solo a coach/service_role).
  const rawTier = String(formData.get("tier") ?? "free");
  const tier: Tier = (TIERS as readonly string[]).includes(rawTier)
    ? (rawTier as Tier)
    : "free";

  const patch = {
    first_name: String(formData.get("first_name") ?? "").trim(),
    last_name: String(formData.get("last_name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || null,
    service_type: String(formData.get("service_type") ?? "open") as ServiceType,
    tier,
    level: String(formData.get("level") ?? "").trim() || null,
    package: String(formData.get("package") ?? "").trim() || null,
    status: String(formData.get("status") ?? "attivo") as SwimmerStatus,
    cert_status: String(formData.get("cert_status") ?? "assente") as CertStatus,
    cert_expiry: String(formData.get("cert_expiry") ?? "").trim() || null,
  };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) return { error: error.message };

  // Onda 19: chi ha il servizio 1:1 ha diritto al token "lezione inclusa" del
  // mese. Lo accreditiamo subito all'assegnazione (se non già presente): il
  // rinnovo mensile lo fa poi il cron.
  if (hasOneToOne(patch.service_type)) {
    const admin = createAdminClient();
    if (admin) await grantMonthlyTokenIfMissing(admin, id);
  }

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
