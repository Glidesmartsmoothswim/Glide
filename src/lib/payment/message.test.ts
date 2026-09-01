import { test } from "node:test";
import assert from "node:assert/strict";
import { paymentRequestCopy, paymentCausale } from "./message";

// PROMPT_CODE_PAGAMENTI TASK 4 (01/09/2026) — "mai assumere": la copy
// distingue SOLO in base a requested_tier === 'one_to_one_season', ogni
// altro valore (open/open_plus/one_to_one_monthly) è canone mensile.
test("paymentRequestCopy — one_to_one_season è pagamento unico stagione", () => {
  const copy = paymentRequestCopy("one_to_one_season");
  assert.equal(copy.isOneOff, true);
  assert.equal(copy.headline, "Pagamento unico, stagione");
});

test("paymentRequestCopy — ogni altro tier (incluso null) è canone mensile", () => {
  for (const tier of ["open", "open_plus", "one_to_one_monthly", null] as const) {
    const copy = paymentRequestCopy(tier);
    assert.equal(copy.isOneOff, false);
    assert.equal(copy.headline, "Canone mensile, si rinnova ogni mese");
  }
});

test("paymentCausale — GLIDE - Nome Cognome - ultime 6 caratteri id", () => {
  assert.equal(
    paymentCausale("Salvatore Amadio", "9f1b2c3d-4444-4444-4444-abcdefabcdef"),
    "GLIDE - Salvatore Amadio - abcdef",
  );
});
