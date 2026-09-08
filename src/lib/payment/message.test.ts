import { test } from "node:test";
import assert from "node:assert/strict";
import { paymentRequestCopy, paymentCausale, bookingCausale } from "./message";

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

test("bookingCausale — estende la causale con la data della lezione, in fuso Roma", () => {
  const id = "0e697137-d4e2-4880-83e1-a1401ac6bc13";
  // 23:30 UTC del 12/09 sono le 01:30 del 13/09 a Roma: deve dire 13/09,
  // altrimenti il coach cerca in agenda una lezione del giorno prima.
  const causale = bookingCausale("Mario Rossi", id, new Date("2026-09-12T23:30:00Z"));
  assert.equal(causale, "GLIDE - Mario Rossi - c6bc13 - lezione 13/09");
  // Resta un prefisso della causale abbonamento: stessa intestazione, in più
  // solo la lezione.
  assert.ok(causale.startsWith(paymentCausale("Mario Rossi", id)));
});
