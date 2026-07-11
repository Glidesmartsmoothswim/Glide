"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; info?: string };

/** Login con email + password. */
export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Inserisci email e password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: traduci(error.message) };

  revalidatePath("/", "layout");
  redirect("/");
}

/** Registrazione con email + password (il profilo lo crea un trigger). */
export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  if (!email || !password)
    return { error: "Inserisci email e password (min. 6 caratteri)." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { first_name: firstName } },
  });
  if (error) return { error: traduci(error.message) };

  // Se il progetto richiede conferma email, non c'è sessione immediata.
  if (!data.session) {
    return {
      info: "Account creato. Controlla la mail per confermare, poi accedi.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/** Logout. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

function traduci(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return "Credenziali non valide.";
  if (/already registered/i.test(msg)) return "Email già registrata.";
  if (/at least 6/i.test(msg)) return "La password deve avere almeno 6 caratteri.";
  return msg;
}
