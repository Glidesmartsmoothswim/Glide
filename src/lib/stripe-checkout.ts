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

export type SubTier = "open" | "open_plus" | "open_water" | "elite";

/**
 * Mappa il piano abbonamento → tier di accesso (Onda 12.1). I piani legacy
 * (open_water/elite) valgono come open_plus. Usata dal webhook.
 */
export function subTierToAccessTier(
  subTier: string | null | undefined,
): "open" | "open_plus" {
  return subTier === "open" ? "open" : "open_plus";
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
        : opts.tier === "open_water"
          ? prices.openWater
          : prices.elite;
  if (!stripe || !priceId) return null;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { type: "subscription", tier: opts.tier, swimmer_id: opts.swimmerId },
    success_url: `${appUrl()}/app/profilo?ok=1`,
    cancel_url: `${appUrl()}/app/profilo?canceled=1`,
  });
  return session.url;
}
