import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tier } from "@/lib/access";
import {
  derivePaymentGate,
  paymentGraceDays,
  type PaymentGate,
} from "@/lib/payment/status";

export type Role = "coach" | "swimmer";

export type Profile = {
  id: string;
  role: Role;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  tier: Tier;
  /** ADR-014: scadenza del periodo pagato corrente. Null = nessun gate. */
  tier_expires_at: string | null;
  /** ADR-016: fatto contabile grezzo. Per decidere permessi usa `payment_gate`. */
  payment_status: string | null;
  /**
   * ADR-016 — gate derivato, calcolato UNA volta per richiesta qui dentro.
   * Tutto ciò che decide un permesso legge questo, mai `payment_status` o
   * `tier_expires_at` grezzi: è la sorgente unica che l'ADR pretende, ed è
   * anche il motivo per cui `accessTier()` resta sincrona nonostante i
   * giorni di grazia arrivino ora da `app_config`.
   */
  payment_gate: PaymentGate;
  /** Gate di re-consenso (GLIDE_CONSENSI.md §6, versione minima Termini +
   *  Informativa). Null = non ancora accettato — solo swimmer, mai il coach. */
  terms_privacy_accepted_at: string | null;
};

/**
 * Giorni di grazia della richiesta corrente. `cache()` di React deduplica la
 * lettura di `app_config` fra le più chiamate a `getCurrentProfile()` che una
 * stessa pagina fa (guida Next "Deduplicating requests", modello senza Cache
 * Components — questo progetto non ha `cacheComponents` attivo).
 */
const currentGraceDays = cache(async (): Promise<number> => {
  return paymentGraceDays(await createClient());
});

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
    .select(
      "id, role, first_name, last_name, email, tier, tier_expires_at, payment_status, terms_privacy_accepted_at",
    )
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
      tier_expires_at: null,
      payment_status: null,
      payment_gate: "not_applicable",
      terms_privacy_accepted_at: null,
    };
  }

  const tier = (profile.tier ?? "free") as Tier;
  const tier_expires_at = (profile.tier_expires_at as string | null) ?? null;
  const payment_status = (profile.payment_status as string | null) ?? null;

  return {
    ...profile,
    tier,
    tier_expires_at,
    payment_status,
    payment_gate: derivePaymentGate(
      { tier, payment_status, paid_at: null, tier_expires_at },
      await currentGraceDays(),
    ),
    terms_privacy_accepted_at:
      (profile.terms_privacy_accepted_at as string | null) ?? null,
  } as Profile;
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
