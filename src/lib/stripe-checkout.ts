import "server-only";
import { getStripe, stripePrices } from "@/lib/stripe";
import { publicEnv } from "@/lib/env";

const appUrl = () => publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

export type SubTier = "open" | "open_water" | "elite";

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
