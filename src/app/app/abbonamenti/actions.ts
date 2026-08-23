"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import {
  createSubscriptionCheckout,
  createSeasonCheckout,
  buildWithdrawalWaiver,
  withdrawalWaived,
  type SubTier,
} from "@/lib/stripe-checkout";

/** Avvia il checkout di un abbonamento (Open / Open+ / 1:1 mensile). */
export async function startSubscription(fd: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  if (!withdrawalWaived(fd)) redirect("/app/abbonamenti?consent=1");
  const tier = String(fd.get("tier") ?? "open") as SubTier;
  const url = await createSubscriptionCheckout({
    tier,
    swimmerId: profile.id,
    waiver: await buildWithdrawalWaiver(),
  });
  redirect(url ?? "/app/abbonamenti?sim=1");
}

/** Avvia il checkout del 1:1 stagionale (one-off). */
export async function startSeason(fd: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  if (!withdrawalWaived(fd)) redirect("/app/abbonamenti?consent=1");
  const url = await createSeasonCheckout({
    swimmerId: profile.id,
    waiver: await buildWithdrawalWaiver(),
  });
  redirect(url ?? "/app/abbonamenti?sim=1");
}
