// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seasonExpiryDate,
  seasonEnrollment,
  expiryFor,
  serviceTypeFor,
} from "./pricing";

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

// --- I due assi dell'attivazione (12/09/2026) -------------------------------
// Regressione dell'incidente: un Pacchetto Stagionale Elite attivato con
// `tier = one_to_one` ma `service_type` rimasto 'open'. `plan_entitlements` si
// legge per service_type e la riga 'open' concede lessons_granted = 0, quindi
// il check-in compreso nel piano è stato fatturato come lezione extra.

test("serviceTypeFor — i piani 1:1 portano il servizio 1:1, non solo il livello", () => {
  assert.equal(serviceTypeFor("one_to_one_season", "open"), "coaching_1_1");
  assert.equal(serviceTypeFor("one_to_one_monthly", "open"), "coaching_1_1");
  // È il caso esatto del 12/09: partiva da 'open' e ci restava.
  assert.notEqual(serviceTypeFor("one_to_one_season", "open"), "open");
});

test("serviceTypeFor — Open e Open+ restano sul servizio 'open'", () => {
  // Open+ è un livello del CANALE: il tipo di servizio non cambia. È il caso
  // dei due profili open_plus/open in produzione, coerenti per costruzione.
  assert.equal(serviceTypeFor("open", null), "open");
  assert.equal(serviceTypeFor("open_plus", null), "open");
  assert.equal(serviceTypeFor("open_plus", "open"), "open");
});

test("serviceTypeFor — 'both' non viene mai cancellato da un rinnovo", () => {
  // Chi ha 1:1 + Canale Open se lo tiene, qualunque piano rinnovi: è una
  // scelta commerciale del coach, non un effetto collaterale dell'incasso.
  for (const t of ["open", "open_plus", "one_to_one_monthly", "one_to_one_season"] as const)
    assert.equal(serviceTypeFor(t, "both"), "both");
});

test("serviceTypeFor — un 1:1 che passa a Open perde davvero il servizio 1:1", () => {
  // Il rovescio della regola precedente: senza questo, un downgrade
  // lascerebbe crediti lezione a chi non li paga più.
  assert.equal(serviceTypeFor("open", "coaching_1_1"), "open");
  assert.equal(serviceTypeFor("open_plus", "coaching_1_1"), "open");
});
