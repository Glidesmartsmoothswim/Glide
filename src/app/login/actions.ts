"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { rateLimitOk } from "@/lib/ratelimit";
import { checkMfaChallengeNeeded, verifyTotpCode } from "@/lib/mfa";

/**
 * Esito delle azioni auth. Nessun redirect DENTRO l'azione: è il client a
 * navigare, così può gestire loading con try/catch/finally e non restare
 * mai bloccato (Sprint 11.2).
 */
export type AuthResult =
  | { ok: true; redirectTo: string }
  | { ok: false; needsConfirmation: true; email: string }
  | { ok: false; needsMfa: true; factorId: string }
  | { ok: false; error: string };

/**
 * Login con email + password. Se l'account ha un fattore MFA verificato e la
 * sessione appena creata non è già aal2, NON si entra ancora: si chiede il
 * codice (`needsMfa`) — altrimenti chi ha attivato la 2FA la aggirerebbe con
 * la sola password a ogni login successivo.
 */
export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password)
    return { ok: false, error: "Inserisci email e password." };
  // Rate limit (S-3): frena il brute-force. No-op senza Upstash.
  if (!(await rateLimitOk("auth", email.toLowerCase())))
    return { ok: false, error: "Troppi tentativi. Riprova tra un minuto." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: traduci(error.message) };

  const challenge = await checkMfaChallengeNeeded(supabase);
  if (challenge.needed) return { ok: false, needsMfa: true, factorId: challenge.factorId };

  revalidatePath("/", "layout");
  return { ok: true, redirectTo: "/" };
}

/**
 * Secondo passo del login quando `signIn` ha risposto `needsMfa`: verifica il
 * codice a 6 cifre sulla sessione già autenticata (password) ma ancora aal1.
 * Se il codice è corretto la sessione sale ad aal2 e si può proseguire.
 */
export async function verifyLoginMfa(
  factorId: string,
  code: string,
): Promise<AuthResult> {
  const supabase = await createClient();
  const result = await verifyTotpCode(supabase, factorId, code);
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/", "layout");
  return { ok: true, redirectTo: "/" };
}

/** Registrazione con email + password (il profilo lo crea un trigger). */
export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  if (!email || !password)
    return { ok: false, error: "Inserisci email e password." };
  if (password.length < 8)
    return { ok: false, error: "La password deve avere almeno 8 caratteri." };
  if (!(await rateLimitOk("auth", email.toLowerCase())))
    return { ok: false, error: "Troppi tentativi. Riprova tra un minuto." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName },
      emailRedirectTo: `${publicEnv.NEXT_PUBLIC_APP_URL}/auth/callback?next=/app/profilo/crea`,
    },
  });
  if (error) return { ok: false, error: traduci(error.message) };

  // Progetto con conferma email attiva: nessuna sessione immediata.
  if (!data.session) return { ok: false, needsConfirmation: true, email };

  revalidatePath("/", "layout");
  // Nuovo nuotatore → wizard di creazione profilo (saltabile).
  return { ok: true, redirectTo: "/app/profilo/crea" };
}

/** Logout. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

function traduci(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Email o password non corretti.";
  if (m.includes("already registered") || m.includes("user already"))
    return "Questa email è già registrata. Prova ad accedere.";
  if (m.includes("email") && m.includes("invalid"))
    return "L'indirizzo email non è valido.";
  if (m.includes("weak") || m.includes("at least"))
    return "Password troppo debole: almeno 8 caratteri.";
  if (m.includes("email not confirmed"))
    return "Devi prima confermare l'email. Controlla la posta.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Troppi tentativi. Riprova tra poco.";
  return "Qualcosa non ha funzionato. Riprova.";
}
