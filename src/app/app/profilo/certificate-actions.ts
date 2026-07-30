"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { certLight } from "@/lib/certificates";

export type CertActionState = { error?: string; info?: string };

/**
 * Registra l'AUTODICHIARAZIONE del certificato medico (Onda 26 · minimizzazione
 * GDPR): si conserva solo la scadenza + il flag `dichiarato`, mai il file.
 * Sincronizza `profiles.cert_status/cert_expiry` (usati da digest, scheda, elenco).
 */
export async function registerCertificate(
  _prev: CertActionState,
  fd: FormData,
): Promise<CertActionState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };

  const data_scadenza = String(fd.get("data_scadenza") ?? "").trim();
  const dichiarato = fd.get("dichiarato") != null;
  const note = String(fd.get("note") ?? "").trim() || null;

  if (!data_scadenza) return { error: "Indica la data di scadenza." };
  if (!dichiarato)
    return { error: "Spunta la dichiarazione per registrare la scadenza." };
  if (certLight(data_scadenza) === "scaduto")
    return { error: "La data indicata è già scaduta." };

  const supabase = await createClient();
  const { error } = await supabase.from("medical_certificates").insert({
    swimmer_id: profile.id,
    data_scadenza,
    dichiarato: true,
    note,
  });
  if (error) return { error: error.message };

  // Sync campo legacy per digest/scheda/elenco (3 stati): scaduto → assente.
  const light = certLight(data_scadenza);
  const cert_status =
    light === "valido" ? "valido" : light === "in_scadenza" ? "in_scadenza" : "assente";
  await supabase
    .from("profiles")
    .update({ cert_status, cert_expiry: data_scadenza })
    .eq("id", profile.id);

  revalidatePath("/app/profilo");
  revalidatePath("/app");
  return { info: "Dichiarazione registrata. Scadenza aggiornata." };
}
