"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { serverFeatures } from "@/lib/flags";
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
 * Crea un nuovo nuotatore = crea l'utente auth (il trigger crea il profilo).
 * Richiede la service_role key. Se Resend non è configurato, non manda
 * l'invito: mostra al coach la password temporanea ("modalità simulata").
 */
export async function createSwimmer(
  _prev: SwimmerActionState,
  formData: FormData,
): Promise<SwimmerActionState> {
  await requireRole("coach");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const serviceType = String(formData.get("service_type") ?? "open") as ServiceType;
  if (!email) return { error: "Serve almeno l'email." };

  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Manca SUPABASE_SERVICE_ROLE_KEY: impossibile creare l'utente. Aggiungila in .env.local.",
    };
  }

  const tempPassword = "glide-" + Math.random().toString(36).slice(2, 10);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (error) return { error: error.message };

  // Completa i campi del profilo creato dal trigger.
  await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      service_type: serviceType,
      role: "swimmer",
    })
    .eq("id", data.user!.id);

  revalidatePath("/coach/nuotatori");

  if (!serverFeatures().resend) {
    return {
      info: `Nuotatore creato. Invito email in modalità simulata (manca RESEND_API_KEY).`,
      tempPassword,
    };
  }
  // Quando Resend sarà attivo: qui parte l'email d'invito (S3/S5).
  return { info: "Nuotatore creato e invitato via email." };
}
