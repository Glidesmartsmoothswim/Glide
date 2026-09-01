import { test } from "node:test";
import assert from "node:assert/strict";
import { gateState, daysOverdue, effectiveTier } from "./gate";
import { PAYMENT_GATE } from "./config";
import { seasonExpiryDate, expiryFor } from "./pricing";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-08-28T12:00:00Z");
const at = (daysFromNow: number) =>
  new Date(NOW.getTime() + daysFromNow * DAY).toISOString();

test("gateState — nessuna scadenza (free/Base o assegnato a mano) = ok, sempre", () => {
  assert.equal(gateState(null, NOW), "ok");
  assert.equal(gateState(undefined, NOW), "ok");
});

test("gateState — scadenza futura = ok", () => {
  assert.equal(gateState(at(5), NOW), "ok");
});

test("gateState — oggi = due", () => {
  assert.equal(gateState(at(0), NOW), "due");
});

test("gateState — dentro la finestra di grazia = grace, accesso invariato", () => {
  assert.equal(gateState(at(-1), NOW), "grace");
  assert.equal(gateState(at(-PAYMENT_GATE.graceDays), NOW), "grace");
});

test("gateState — oltre la grazia = overdue", () => {
  assert.equal(gateState(at(-(PAYMENT_GATE.graceDays + 1)), NOW), "overdue");
  assert.equal(gateState(at(-90), NOW), "overdue");
});

test("daysOverdue — 0 se non scaduto o senza scadenza, altrimenti giorni reali", () => {
  assert.equal(daysOverdue(null, NOW), 0);
  assert.equal(daysOverdue(at(5), NOW), 0);
  assert.equal(daysOverdue(at(-3), NOW), 3);
});

test("effectiveTier — ADR-014: overdue collassa sul tier free, mai un cron che lo fa da solo (calcolo solo a lettura)", () => {
  assert.equal(effectiveTier("open_plus", at(5), "free", NOW), "open_plus");
  assert.equal(effectiveTier("open_plus", at(-1), "free", NOW), "open_plus"); // grace: invariato
  assert.equal(effectiveTier("open_plus", at(-30), "free", NOW), "free"); // overdue
  // l'override del coach (sposta avanti tier_expires_at) riattiva subito.
  assert.equal(effectiveTier("open_plus", at(10), "free", NOW), "open_plus");
});

test("expiryFor — mensile = +1 mese da ora, stagionale = 31 agosto fisso (TASK 5)", () => {
  const monthly = expiryFor("open", NOW);
  assert.equal(monthly.getUTCMonth(), 8); // settembre (0-based), da agosto
  const season = expiryFor("one_to_one_season", NOW);
  assert.deepEqual(season, seasonExpiryDate(NOW));
});

test("expiryFor — stagionale: data fissa 31/08 dell'anno successivo, indipendente dal mese di richiesta (TASK 5)", () => {
  // Iscrizione anticipata in seconda metà agosto (NOW = 28/08/2026): non
  // deve far scattare un undicesimo mese né spostare la scadenza.
  const lateAugust = expiryFor("one_to_one_season", NOW);
  assert.equal(lateAugust.getUTCFullYear(), 2027);
  assert.equal(lateAugust.getUTCMonth(), 7); // agosto (0-based)
  assert.equal(lateAugust.getUTCDate(), 31);

  // Un pagamento in un mese diverso (es. gennaio) resta sulla stessa regola
  // fissa: 31/08 dell'anno successivo al pagamento, mai "pagamento + 10 mesi".
  const january = expiryFor("one_to_one_season", new Date("2027-01-15T12:00:00Z"));
  assert.equal(january.getUTCFullYear(), 2028);
  assert.equal(january.getUTCMonth(), 7);
  assert.equal(january.getUTCDate(), 31);
});
