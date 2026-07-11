import "server-only";
import Stripe from "stripe";
import { configured } from "@/lib/env";
import { serverFeatures } from "@/lib/flags";

/**
 * Stripe lato SERVER, inizializzato in modo LAZY.
 * Ritorna null quando le chiavi non sono configurate: chi chiama
 * gestisce il caso "simulato" invece di crashare (requisito Sprint 0).
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!serverFeatures().stripe) return null;
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true });
  }
  return _stripe;
}

/** Price ID configurati su Stripe (undefined se placeholder). */
export function stripePrices() {
  const pick = (v?: string) => (configured(v) ? v : undefined);
  return {
    open: pick(process.env.STRIPE_PRICE_OPEN), // € 29 / mese
    openWater: pick(process.env.STRIPE_PRICE_OPEN_WATER), // € 79 / mese
    elite: pick(process.env.STRIPE_PRICE_ELITE), // € 129 / mese
    birra: pick(process.env.STRIPE_PRICE_BIRRA), // € 5 una tantum
  } as const;
}
