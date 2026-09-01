import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEpcPayload } from "./epc-qr";

// PROMPT_CODE_PAGAMENTI TASK 3 (01/09/2026) — payload EPC069-12 a 11 righe
// esatte. Le due righe vuote prima della causale sono due campi distinti
// (purpose + riferimento strutturato): una versione precedente di questo
// prompt aveva sbagliato proprio questo punto, collassandole in una sola.
test("buildEpcPayload — 11 righe, ordine fisso BCD/002/1/SCT/../nome/iban/importo/../../causale", () => {
  const payload = buildEpcPayload({
    iban: "IT36Q0503405493000000000783",
    holder: "COPPOLA ALESSIO",
    amountCents: 7600,
    causale: "GLIDE - Mario Rossi - abcdef",
  });
  const lines = payload.split("\n");
  assert.equal(lines.length, 11);
  assert.deepEqual(lines, [
    "BCD",
    "002",
    "1",
    "SCT",
    "",
    "COPPOLA ALESSIO",
    "IT36Q0503405493000000000783",
    "EUR76.00",
    "",
    "",
    "GLIDE - Mario Rossi - abcdef",
  ]);
});

test("buildEpcPayload — importo sempre con 2 decimali, punto (non virgola)", () => {
  const payload = buildEpcPayload({
    iban: "IT36Q0503405493000000000783",
    holder: "COPPOLA ALESSIO",
    amountCents: 4600,
    causale: "GLIDE - Test - 000001",
  });
  assert.match(payload, /EUR46\.00\n/);
});

test("buildEpcPayload — spazi nell'IBAN rimossi (formato QR richiede IBAN compatto)", () => {
  const payload = buildEpcPayload({
    iban: "IT36 Q050 3405 4930 0000 0000 783",
    holder: "COPPOLA ALESSIO",
    amountCents: 100,
    causale: "GLIDE - Test - 000001",
  });
  assert.match(payload, /\nIT36Q0503405493000000000783\n/);
});
