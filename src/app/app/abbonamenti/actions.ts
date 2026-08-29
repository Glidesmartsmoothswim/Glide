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
import {
  eliteTotalPriceCents,
  eliteSelectionLabel,
  WORKOUT_FREQUENCIES,
  CHECKIN_CADENCES,
  CHECKIN_CHANNELS,
  BILLING_PERIODS,
  type WorkoutFrequency,
  type CheckinCadence,
  type CheckinChannel,
  type BillingPeriod,
} from "@/lib/payment/elite-pricing";

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

/**
 * 1:1 Elite (GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md) — prezzo da questionario.
 * Il prezzo è SEMPRE ricalcolato qui, server-side, dalla selezione grezza:
 * mai fidarsi di un importo mandato dal client (stesso principio del resto
 * del progetto — es. ADR-002 regola 1, mai un dato sensibile dal client).
 */
export async function startEliteActivation(fd: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  if (!withdrawalWaived(fd)) redirect("/app/abbonamenti?consent=1");

  const allenamenti = Number(fd.get("allenamenti")) as WorkoutFrequency;
  const cadenza = String(fd.get("cadenza") ?? "") as CheckinCadence;
  const canale = String(fd.get("canale") ?? "") as CheckinChannel;
  const periodo = String(fd.get("periodo") ?? "mensile") as BillingPeriod;

  if (
    !WORKOUT_FREQUENCIES.includes(allenamenti) ||
    !CHECKIN_CADENCES.includes(cadenza) ||
    !CHECKIN_CHANNELS.includes(canale) ||
    !BILLING_PERIODS.includes(periodo)
  )
    redirect("/app/abbonamenti?err=1");

  const sel = { allenamenti, cadenza, canale };
  const amountCents = eliteTotalPriceCents(sel, periodo);
  const detail = eliteSelectionLabel(sel, periodo);

  const admin = createAdminClient();
  if (!admin) redirect("/app/abbonamenti?sim=1");

  const result = await requestActivation(
    admin,
    { id: profile.id, email: profile.email, firstName: profile.first_name },
    "one_to_one_monthly",
    await buildWithdrawalWaiver(),
    { amountCentsOverride: amountCents, detail },
  );
  redirect(
    result.error
      ? "/app/abbonamenti?err=1"
      : "/app/abbonamenti?requested=1",
  );
}
