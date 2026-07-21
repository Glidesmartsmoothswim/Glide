import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tier } from "@/lib/access";

export type Role = "coach" | "swimmer";

export type Profile = {
  id: string;
  role: Role;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  tier: Tier;
};

/**
 * Ritorna l'utente corrente col suo profilo, oppure null se non loggato.
 * Legge profiles.role: è la base del gating per ruolo.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  // Onda 15: id utente dai claims (verifica JWT locale con chiavi asimmetriche),
  // niente getUser() di rete. La sicurezza dei dati resta la RLS.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = claims?.sub;
  if (!userId) return null;
  const email = (claims?.email as string | undefined) ?? null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, email, tier")
    .eq("id", userId)
    .single();

  // Fallback prudente: se il profilo non c'è ancora (trigger in ritardo),
  // trattiamo come swimmer così l'app non si rompe.
  if (!profile) {
    return {
      id: userId,
      role: "swimmer",
      first_name: null,
      last_name: null,
      email,
      tier: "free",
    };
  }
  return { ...profile, tier: (profile.tier ?? "free") as Tier } as Profile;
}

/** Home corretta per ruolo. */
export function homeForRole(role: Role): string {
  return role === "coach" ? "/coach" : "/app";
}

/**
 * Da usare nei layout di sezione: garantisce login + ruolo atteso.
 * Se il ruolo non combacia, reindirizza alla sezione giusta.
 */
export async function requireRole(role: Role): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== role) redirect(homeForRole(profile.role));
  return profile;
}
