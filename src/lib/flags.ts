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
    // Lato server per checkout + webhook basta la SECRET key (runtime).
    // NB: non dipende dalla publishable (NEXT_PUBLIC, inlined a build-time):
    // così l'accensione non è ostaggio della cache di build di Vercel.
    stripe: configured(process.env.STRIPE_SECRET_KEY),
    // Verifica firma webhook Stripe.
    stripeWebhook: configured(process.env.STRIPE_WEBHOOK_SECRET),
    // Invio email transazionali.
    resend: configured(process.env.RESEND_API_KEY),
    // Assistente AI (L0/L1, ADR-001). Il safety router funziona ANCHE senza.
    ai: configured(process.env.ANTHROPIC_API_KEY),
  } as const;
}

/**
 * Flag disponibili anche nel BROWSER (solo da NEXT_PUBLIC_*).
 * Utile per mostrare i badge "simulato" nell'interfaccia.
 */
export const clientFeatures = {
  stripe: Boolean(stripePublishableKey),
} as const;
