import { test } from "node:test";
import assert from "node:assert/strict";
import { gateState, daysOverdue, effectiveTier } from "./gate";
import { PAYMENT_GATE } from "./config";
import { seasonExpiryDate, seasonEnrollment, expiryFor } from "./pricing";

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

test("expiryFor — mensile = +1 mese da ora, stagionale = 31 agosto fisso per iscrizione anticipata (TASK 5)", () => {
  const monthly = expiryFor("open", NOW);
  assert.equal(monthly.getUTCMonth(), 8); // settembre (0-based), da agosto
  // NOW = 28/08/2026: iscrizione ANTICIPATA (agosto, prima dell'inizio
  // stagione) → 31/08 dell'anno successivo, non "pagamento + 10 mesi".
  const season = expiryFor("one_to_one_season", NOW);
  assert.deepEqual(season, seasonExpiryDate(NOW));
  assert.equal(season.getUTCFullYear(), 2027);
  assert.equal(season.getUTCMonth(), 7); // agosto (0-based)
  assert.equal(season.getUTCDate(), 31);
});

// Chiarimento utente (01/09/2026) — "iscrizione a stagione già iniziata"
// (Settembre in poi): la scadenza è SEMPRE fine giugno, mai il 31/08
// dell'anno successivo — quella resta solo per l'iscrizione anticipata
// (luglio/agosto, test sopra).
test("expiryFor — stagionale: fine giugno per iscrizione a stagione già iniziata (non 31/08)", () => {
  const september = expiryFor("one_to_one_season", new Date("2026-09-05T12:00:00Z"));
  assert.equal(september.getUTCFullYear(), 2027);
  assert.equal(september.getUTCMonth(), 5); // giugno (0-based)
  assert.equal(september.getUTCDate(), 30);

  const january = expiryFor("one_to_one_season", new Date("2027-01-15T12:00:00Z"));
  assert.equal(january.getUTCFullYear(), 2027);
  assert.equal(january.getUTCMonth(), 5);
  assert.equal(january.getUTCDate(), 30);
});

test("seasonEnrollment — luglio/agosto anticipata (10 mesi, 15%, 31/08 succ.); Sett-Dic 15% mesi residui; Gen-Giu 10% mesi residui", () => {
  const august = seasonEnrollment(new Date("2026-08-05T12:00:00Z"));
  assert.equal(august.isPreSeason, true);
  assert.equal(august.months, 10);
  assert.equal(august.discount, 0.15);

  const september = seasonEnrollment(new Date("2026-09-05T12:00:00Z"));
  assert.equal(september.isPreSeason, false);
  assert.equal(september.months, 10);
  assert.equal(september.discount, 0.15);

  const december = seasonEnrollment(new Date("2026-12-20T12:00:00Z"));
  assert.equal(december.months, 7);
  assert.equal(december.discount, 0.15);

  const january = seasonEnrollment(new Date("2027-01-02T12:00:00Z"));
  assert.equal(january.isPreSeason, false);
  assert.equal(january.months, 6);
  assert.equal(january.discount, 0.1);

  const june = seasonEnrollment(new Date("2027-06-15T12:00:00Z"));
  assert.equal(june.months, 1);
  assert.equal(june.discount, 0.1);
});
