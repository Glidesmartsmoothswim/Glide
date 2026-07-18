"use server";

import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";

export type ForgotState = { error?: string; sent?: boolean };

/**
 * Invia l'email di ripristino password.
 * redirectTo → /auth/callback (scambia il code) → /reset-password.
 * Risposta sempre "neutra" (non riveliamo se l'email esiste: anti-enumeration).
 */
export async function requestReset(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Inserisci la tua email." };

  const supabase = await createClient();
  const redirectTo = `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`;
  await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  // Sempre "sent": non distinguiamo email esistente da inesistente.
  return { sent: true };
}
