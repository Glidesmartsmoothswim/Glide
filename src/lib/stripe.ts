import "server-only";
import Stripe from "stripe";
import { getServerEnv } from "@/lib/env";

/**
 * Istanza Stripe lato SERVER. Non importare mai in codice client.
 */
export const stripe = new Stripe(getServerEnv().STRIPE_SECRET_KEY, {
  typescript: true,
});

/** Mappa dei prezzi configurati su Stripe (Price ID). */
export function stripePrices() {
  const env = getServerEnv();
  return {
    open: env.STRIPE_PRICE_OPEN, // € 29 / mese
    openWater: env.STRIPE_PRICE_OPEN_WATER, // € 79 / mese
    elite: env.STRIPE_PRICE_ELITE, // € 129 / mese
    birra: env.STRIPE_PRICE_BIRRA, // € 5 una tantum
  } as const;
}
