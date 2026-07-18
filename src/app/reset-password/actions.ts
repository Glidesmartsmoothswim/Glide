"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ResetState = { error?: string };

/** Imposta la nuova password (richiede la sessione di recupero già attiva). */
export async function updatePassword(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8)
    return { error: "La password deve avere almeno 8 caratteri." };
  if (password !== confirm) return { error: "Le due password non coincidono." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      error: "Sessione scaduta. Richiedi un nuovo link di ripristino.",
    };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (/different from the old/i.test(error.message))
      return { error: "La nuova password deve essere diversa dalla precedente." };
    if (/at least/i.test(error.message))
      return { error: "La password deve avere almeno 8 caratteri." };
    return { error: error.message };
  }

  // Chiudiamo la sessione di recupero e mandiamo al login con conferma.
  await supabase.auth.signOut();
  redirect("/login?reset=1");
}
