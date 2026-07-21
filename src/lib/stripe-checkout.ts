import "server-only";
import { getStripe, stripePrices } from "@/lib/stripe";
import { publicEnv } from "@/lib/env";

/**
 * Base URL per success/cancel. Preferisce NEXT_PUBLIC_APP_URL se è un dominio
 * reale; in fallback usa VERCEL_URL (impostata da Vercel) — utile in preview.
 */
const appUrl = () => {
  const configured = publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (!/localhost|127\.0\.0\.1/.test(configured)) return configured;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return configured;
};

export type SubTier =
  | "open"
  | "open_plus"
  | "one_to_one_monthly"
  | "open_water"
  | "elite";

/**
 * Mappa il piano abbonamento → tier di accesso. I piani legacy
 * (open_water/elite) valgono come open_plus; il 1:1 mensile → one_to_one.
 * Usata dal webhook.
 */
export function subTierToAccessTier(
  subTier: string | null | undefined,
): "open" | "open_plus" | "one_to_one" {
  if (subTier === "open") return "open";
  if (subTier === "one_to_one_monthly" || subTier === "one_to_one")
    return "one_to_one";
  return "open_plus";
}

/**
 * Fine stagione 1:1: il prossimo 30 giugno (la stagione va set→giu). Serve al
 * pagamento stagionale one-off per fissare la scadenza del tier.
 */
export function seasonEnd(now = new Date()): Date {
  const y = now.getUTCFullYear();
  const june30 = Date.UTC(y, 5, 30, 23, 59, 59);
  return now.getTime() <= june30
    ? new Date(june30)
    : new Date(Date.UTC(y + 1, 5, 30, 23, 59, 59));
}

/**
 * Checkout una tantum "Offrimi una birra" (€5) per sbloccare un video.
 * Ritorna l'URL di Stripe, o null se Stripe/price non configurati.
 */
export async function createBirraCheckout(opts: {
  videoId: string;
  swimmerId: string;
}): Promise<string | null> {
  const stripe = getStripe();
  const prices = stripePrices();
  if (!stripe || !prices.birra) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: prices.birra, quantity: 1 }],
    metadata: {
      type: "birra",
      video_id: opts.videoId,
      swimmer_id: opts.swimmerId,
    },
    success_url: `${appUrl()}/app/video?ok=1`,
    cancel_url: `${appUrl()}/app/video?canceled=1`,
  });
  return session.url;
}

/**
 * Checkout abbonamento (Open/Open Water/Elite).
 * Ritorna l'URL di Stripe, o null se Stripe/price non configurati.
 */
export async function createSubscriptionCheckout(opts: {
  tier: SubTier;
  swimmerId: string;
}): Promise<string | null> {
  const stripe = getStripe();
  const prices = stripePrices();
  const priceId =
    opts.tier === "open"
      ? prices.open
      : opts.tier === "open_plus"
        ? prices.openPlus
        : opts.tier === "one_to_one_monthly"
          ? prices.oneToOneMonthly
          : opts.tier === "open_water"
            ? prices.openWater
            : prices.elite;
  if (!stripe || !priceId) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    metadata: { type: "subscription", tier: opts.tier, swimmer_id: opts.swimmerId },
    success_url: `${appUrl()}/app/abbonamenti?ok=1`,
    cancel_url: `${appUrl()}/app/abbonamenti?canceled=1`,
  });
  return session.url;
}

/**
 * Checkout STAGIONALE 1:1 (one-off 690€, valido fino a fine giugno).
 * mode payment; il webhook fissa tier one_to_one + scadenza a fine stagione.
 */
export async function createSeasonCheckout(opts: {
  swimmerId: string;
}): Promise<string | null> {
  const stripe = getStripe();
  const prices = stripePrices();
  if (!stripe || !prices.oneToOneSeason) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: prices.oneToOneSeason, quantity: 1 }],
    allow_promotion_codes: true,
    metadata: {
      type: "season",
      tier: "one_to_one",
      swimmer_id: opts.swimmerId,
      season_end: seasonEnd().toISOString(),
    },
    success_url: `${appUrl()}/app/abbonamenti?ok=1`,
    cancel_url: `${appUrl()}/app/abbonamenti?canceled=1`,
  });
  return session.url;
}
