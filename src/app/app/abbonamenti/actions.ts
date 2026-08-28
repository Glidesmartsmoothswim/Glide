"use server";

import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildWithdrawalWaiver,
  withdrawalWaived,
} from "@/lib/legal/withdrawal";
import { requestActivation } from "@/lib/payment/request";
import type { SubTier } from "@/lib/payment/pricing";

/**
 * ADR-014 — "Richiedi attivazione" sostituisce il checkout Stripe: crea
 * l'entitlement pending_payment e avvisa via email. Passa dall'admin client
 * (service_role): profiles.payment_status è protetto da trigger e non
 * scrivibile dal client RLS-rispettoso del nuotatore (migration_043).
 */
export async function startActivation(fd: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  if (!withdrawalWaived(fd)) redirect("/app/abbonamenti?consent=1");

  const tier = String(fd.get("tier") ?? "open") as SubTier;
  const admin = createAdminClient();
  if (!admin) redirect("/app/abbonamenti?sim=1");

  const result = await requestActivation(
    admin,
    { id: profile.id, email: profile.email, firstName: profile.first_name },
    tier,
    await buildWithdrawalWaiver(),
  );
  redirect(
    result.error
      ? "/app/abbonamenti?err=1"
      : "/app/abbonamenti?requested=1",
  );
}
