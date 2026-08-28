import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * ADR-014 — Stripe è uscito dal progetto. L'endpoint resta nel codice
 * (non rimosso, come da vincolo di sessione) ma è disattivato: risponde
 * sempre 410, senza toccare Stripe/DB. Sostituisce i test del vecchio
 * webhook (rimossi con la logica che testavano).
 */
test("webhook stripe disattivato: risponde sempre 410, qualunque richiesta", async () => {
  const { POST } = await import("./route");
  const res = await POST();
  assert.equal(res.status, 410);
});
