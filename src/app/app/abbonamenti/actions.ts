"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import {
  createSubscriptionCheckout,
  createSeasonCheckout,
  type SubTier,
} from "@/lib/stripe-checkout";

/** Avvia il checkout di un abbonamento (Open / Open+ / 1:1 mensile). */
export async function startSubscription(fd: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const tier = String(fd.get("tier") ?? "open") as SubTier;
  const url = await createSubscriptionCheckout({ tier, swimmerId: profile.id });
  redirect(url ?? "/app/abbonamenti?sim=1");
}

/** Avvia il checkout del 1:1 stagionale (one-off). */
export async function startSeason() {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const url = await createSeasonCheckout({ swimmerId: profile.id });
  redirect(url ?? "/app/abbonamenti?sim=1");
}
