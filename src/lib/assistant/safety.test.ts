import { test } from "node:test";
import assert from "node:assert/strict";
import { classify } from "./safety";

// Enforcement health router (A-4): il matcher deterministico classifica PRIMA
// di qualsiasi LLM. Se scatta, il router non chiama mai il modello (verificato
// in router.ts: callModel è raggiunto solo quando classify === null).
// I termini qui sono già nel vocabolario di ADR-004: non se ne inventano.

test("A-4: red flag (petto/respiro) → l2 (template fisso, zero LLM)", () => {
  assert.equal(classify("ho un dolore al petto"), "l2");
  assert.equal(classify("mi manca il respiro"), "l2");
  assert.equal(classify("mi gira la testa"), "l2");
});

test("A-4: muscoloscheletrico → l1", () => {
  assert.equal(classify("ho male alla spalla"), "l1");
});

test("A-4: messaggio normale → null (solo qui si può chiamare il modello)", () => {
  assert.equal(classify("come imposto la virata?"), null);
});

test("A-4: L2 vince su L1 quando compaiono entrambi", () => {
  assert.equal(classify("dolore alla spalla e fiato corto"), "l2");
});
