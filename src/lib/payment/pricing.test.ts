import { test } from "node:test";
import assert from "node:assert/strict";
import { seasonExpiryDate, seasonEnrollment, expiryFor } from "./pricing";

// Erano in gate.test.ts, che testava il gate ADR-014 ora rimosso (sostituito
// da status.ts / ADR-016): sono sempre stati test di LISTINO, non di gate.
const NOW = new Date("2026-08-28T12:00:00Z");

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
