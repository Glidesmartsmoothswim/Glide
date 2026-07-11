"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import {
  createSubscriptionCheckout,
  type SubTier,
} from "@/lib/stripe-checkout";

/** Avvia il checkout abbonamento; se Stripe non è configurato → nota simulata. */
export async function subscribe(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const tier = String(formData.get("tier") ?? "open") as SubTier;
  const url = await createSubscriptionCheckout({ tier, swimmerId: profile.id });
  redirect(url ?? "/app/profilo?sim=1");
}
