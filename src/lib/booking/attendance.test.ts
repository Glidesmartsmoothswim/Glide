// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { test } from "node:test";
import assert from "node:assert/strict";
import { canMarkAttendance } from "./attendance";

const ORA = Date.parse("2026-09-14T12:00:00Z");

test("canMarkAttendance — una lezione futura non si può chiudere", () => {
  // Il caso del 13/09: confermata e, un attimo dopo, segnata "fatta".
  assert.equal(
    canMarkAttendance(
      { status: "confirmed", starts_at: "2026-09-19T09:00:00Z" },
      ORA,
    ),
    false,
  );
});

test("canMarkAttendance — dall'inizio della lezione in poi si segna", () => {
  assert.equal(
    canMarkAttendance(
      { status: "confirmed", starts_at: "2026-09-14T11:00:00Z" },
      ORA,
    ),
    true,
  );
  // Al minuto esatto dell'inizio: il coach segna chi è in acqua.
  assert.equal(
    canMarkAttendance(
      { status: "confirmed", starts_at: "2026-09-14T12:00:00Z" },
      ORA,
    ),
    true,
  );
});

test("canMarkAttendance — solo una prenotazione confermata", () => {
  for (const status of ["pending", "cancelled", "completed", "no_show"])
    assert.equal(
      canMarkAttendance({ status, starts_at: "2026-09-14T11:00:00Z" }, ORA),
      false,
      `${status} non deve passare`,
    );
});

test("canMarkAttendance — dati mancanti o illeggibili: chiuso", () => {
  assert.equal(canMarkAttendance({ status: "confirmed", starts_at: null }, ORA), false);
  assert.equal(
    canMarkAttendance({ status: "confirmed", starts_at: "non-una-data" }, ORA),
    false,
  );
  assert.equal(canMarkAttendance({ status: null, starts_at: null }, ORA), false);
});
