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
  eliteSeasonQuote,
  eliteSeasonLabel,
  billingPeriodForCadence,
  WORKOUT_FREQUENCIES,
  CHECKIN_CADENCES,
  CHECKIN_CHANNELS,
  type WorkoutFrequency,
  type CheckinCadence,
  type CheckinChannel,
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

  if (
    !WORKOUT_FREQUENCIES.includes(allenamenti) ||
    !CHECKIN_CADENCES.includes(cadenza) ||
    !CHECKIN_CHANNELS.includes(canale)
  )
    redirect("/app/abbonamenti?err=1");

  // Doc v3 (30/08): il rinnovo/incasso segue 1:1 la cadenza di check-in,
  // mai una scelta indipendente dal client (nemmeno il campo hidden).
  const periodo = billingPeriodForCadence(cadenza);
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

/**
 * TASK 7 (feedback 29/08) — stessa selezione del questionario Elite, ma
 * prepagamento dell'intera stagione con sconto 15% (doc v3, era 10%)
 * invece che mese per mese. Stesso principio ADR-002 regola 1: il prezzo scontato è
 * ricalcolato qui da `eliteSeasonQuote`, mai da un importo del client.
 * PROMPT_CODE_PAGAMENTI TASK 4 (01/09/2026): `requested_tier` è ora
 * "one_to_one_season" (prima era "one_to_one_monthly" anche qui — bug di
 * discriminazione: senza questo, ogni messaggio/QR di richiesta pagamento
 * per una stagione prepagata leggeva "canone mensile" invece di "pagamento
 * unico stagione", vedi lib/payment/message.ts). `markPaid`
 * (lib/payment/request.ts) legge lo stesso `requested_tier` per applicare
 * la scadenza fissa di stagione (TASK 5), senza bisogno di un
 * `periodMonths` scelto a mano dal coach.
 */
export async function startEliteSeasonActivation(fd: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) return;
  if (!withdrawalWaived(fd)) redirect("/app/abbonamenti?consent=1");

  const allenamenti = Number(fd.get("allenamenti")) as WorkoutFrequency;
  const cadenza = String(fd.get("cadenza") ?? "") as CheckinCadence;
  const canale = String(fd.get("canale") ?? "") as CheckinChannel;

  if (
    !WORKOUT_FREQUENCIES.includes(allenamenti) ||
    !CHECKIN_CADENCES.includes(cadenza) ||
    !CHECKIN_CHANNELS.includes(canale)
  )
    redirect("/app/abbonamenti?err=1");

  const sel = { allenamenti, cadenza, canale };
  const quote = eliteSeasonQuote(sel);
  const detail = eliteSeasonLabel(sel, quote.months);

  const admin = createAdminClient();
  if (!admin) redirect("/app/abbonamenti?sim=1");

  const result = await requestActivation(
    admin,
    { id: profile.id, email: profile.email, firstName: profile.first_name },
    "one_to_one_season",
    await buildWithdrawalWaiver(),
    { amountCentsOverride: quote.discountedCents, detail },
  );
  redirect(
    result.error
      ? "/app/abbonamenti?err=1"
      : "/app/abbonamenti?requested=1",
  );
}
