import { configured } from "@/lib/env";

/**
 * Feature flag: quali integrazioni sono realmente configurate.
 *
 * Requisito Sprint 0: se mancano le chiavi, la funzione resta "simulata"
 * e l'app non deve crashare. Queste flag pilotano quel comportamento.
 *
 * ADR-014: Stripe è uscito dal progetto (incasso manuale, vedi
 * lib/payment/*) — non ci sono più flag stripe/stripeWebhook qui.
 */

/**
 * Flag lato SERVER (leggono i segreti). Usare in route handler / azioni.
 */
export function serverFeatures() {
  return {
    // Invio email transazionali.
    resend: configured(process.env.RESEND_API_KEY),
    // Assistente AI (L0/L1, ADR-001). Il safety router funziona ANCHE senza.
    ai: configured(process.env.ANTHROPIC_API_KEY),
  } as const;
}
