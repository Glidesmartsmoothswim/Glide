/**
 * ADR-014 — Stripe è uscito dal progetto (incasso manuale, vedi
 * lib/payment/*). Endpoint disattivato ma NON rimosso dal codice: risponde
 * sempre 410, nessuna chiamata SDK Stripe, nessun DROP su `stripe_events`/
 * `subscriptions`/`transactions` (dati storici intatti).
 */
export async function POST() {
  return new Response("Stripe non è più attivo su GLIDE (ADR-014).", {
    status: 410,
  });
}
