/**
 * ADR-014 — listino piani, ora usato dal flusso di attivazione manuale
 * invece che dai Price ID Stripe (rimossi con lib/stripe.ts).
 * Importi ripresi dai Price ID storici (lib/stripe.ts, ora rimosso).
 */
export type SubTier =
  | "open"
  | "open_plus"
  | "one_to_one_monthly"
  | "one_to_one_season";

export const TIER_PRICE_CENTS: Record<SubTier, number> = {
  open: 1290,
  open_plus: 1990,
  one_to_one_monthly: 7900,
  one_to_one_season: 69000,
};

export const TIER_LABEL: Record<SubTier, string> = {
  open: "Open",
  open_plus: "Open+",
  one_to_one_monthly: "1:1 mensile",
  one_to_one_season: "1:1 stagionale",
};

/** Piano di accesso (profiles.tier) risultante da un piano attivato. */
export function subTierToAccessTier(
  tier: SubTier,
): "open" | "open_plus" | "one_to_one" {
  if (tier === "open") return "open";
  if (tier === "open_plus") return "open_plus";
  return "one_to_one";
}

/** true per i piani mensili ricorrenti (periodo = 1 mese da paid_at). */
export function isMonthly(tier: SubTier): boolean {
  return tier !== "one_to_one_season";
}

/**
 * Fine stagione 1:1: il prossimo 30 giugno (la stagione va set→giu).
 * Spostato da lib/stripe-checkout.ts (rimosso), logica invariata.
 */
export function seasonEnd(now = new Date()): Date {
  const y = now.getUTCFullYear();
  const june30 = Date.UTC(y, 5, 30, 23, 59, 59);
  return now.getTime() <= june30
    ? new Date(june30)
    : new Date(Date.UTC(y + 1, 5, 30, 23, 59, 59));
}

/** Scadenza del periodo che parte ORA, per il piano richiesto. */
export function expiryFor(tier: SubTier, from = new Date()): Date {
  if (tier === "one_to_one_season") return seasonEnd(from);
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}
