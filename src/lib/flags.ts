import { configured, stripePublishableKey } from "@/lib/env";

/**
 * Feature flag: quali integrazioni sono realmente configurate.
 *
 * Requisito Sprint 0: se mancano le chiavi, la funzione resta "simulata"
 * e l'app non deve crashare. Queste flag pilotano quel comportamento.
 */

/**
 * Flag lato SERVER (leggono i segreti). Usare in route handler / azioni.
 */
export function serverFeatures() {
  return {
    // Pagamenti reali possibili solo con segreto + pubblicabile.
    stripe:
      configured(process.env.STRIPE_SECRET_KEY) &&
      configured(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    // Verifica firma webhook Stripe.
    stripeWebhook: configured(process.env.STRIPE_WEBHOOK_SECRET),
    // Invio email transazionali.
    resend: configured(process.env.RESEND_API_KEY),
  } as const;
}

/**
 * Flag disponibili anche nel BROWSER (solo da NEXT_PUBLIC_*).
 * Utile per mostrare i badge "simulato" nell'interfaccia.
 */
export const clientFeatures = {
  stripe: Boolean(stripePublishableKey),
} as const;
