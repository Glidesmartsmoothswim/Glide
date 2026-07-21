"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { certLight } from "@/lib/certificates";

export type CertActionState = { error?: string; info?: string };

/**
 * Registra un certificato medico già caricato su storage privato (13.2).
 * Aggiorna anche `profiles.cert_status/cert_expiry` (usati dalle viste legacy:
 * digest, scheda). Il file resta accessibile solo via URL firmato.
 */
export async function registerCertificate(
  _prev: CertActionState,
  fd: FormData,
): Promise<CertActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };

  const file_key = String(fd.get("file_key") ?? "").trim();
  const mime_type = String(fd.get("mime_type") ?? "").trim() || null;
  const data_scadenza = String(fd.get("data_scadenza") ?? "").trim();
  const note = String(fd.get("note") ?? "").trim() || null;

  if (!file_key) return { error: "Carica prima il file." };
  if (!data_scadenza) return { error: "Indica la data di scadenza." };

  const supabase = await createClient();
  const { error } = await supabase.from("medical_certificates").insert({
    swimmer_id: profile.id,
    file_key,
    mime_type,
    data_scadenza,
    note,
  });
  if (error) return { error: error.message };

  // Sync campo legacy per digest/scheda (3 stati): scaduto → assente.
  const light = certLight(data_scadenza);
  const cert_status =
    light === "valido" ? "valido" : light === "in_scadenza" ? "in_scadenza" : "assente";
  await supabase
    .from("profiles")
    .update({ cert_status, cert_expiry: data_scadenza })
    .eq("id", profile.id);

  revalidatePath("/app/profilo");
  revalidatePath("/app");
  return { info: "Certificato caricato. Scadenza registrata." };
}
