"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Gate di re-consenso (docs/legal/GLIDE_CONSENSI.md §6) — versione minima
 * richiesta per il lancio: solo accettazione di Termini e Informativa
 * Privacy, non i consensi granulari C1/C2/C3 (salute/video/marketing),
 * che restano bozza in attesa di validazione legale/DPO, non toccati qui.
 * Una tantum per utente: nessun versionamento del testo in questa versione
 * (se in futuro cambia il testo, andrà aggiunta una colonna `_version` e
 * ri-richiesto — fuori scope stanotte).
 */
export async function acceptTermsPrivacy(): Promise<{ error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ terms_privacy_accepted_at: new Date().toISOString() })
    .eq("id", profile.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return {};
}
