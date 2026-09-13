// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { test } from "node:test";
import assert from "node:assert/strict";
import { isBookableMode, onlyBookable, LISTINO_MODE } from "./modes";

test("isBookableMode — il listino non si prenota, i servizi sì", () => {
  assert.equal(isBookableMode("pool"), true);
  assert.equal(isBookableMode("remote"), true);
  assert.equal(isBookableMode("group"), true);
  assert.equal(isBookableMode(LISTINO_MODE), false);
  // Una modalità sconosciuta è chiusa, non aperta: se un domani ne nasce una
  // nuova, deve essere una scelta esplicita e non passare per distrazione.
  assert.equal(isBookableMode("qualcosa_di_nuovo"), false);
  assert.equal(isBookableMode(null), false);
  assert.equal(isBookableMode(undefined), false);
});

test("onlyBookable — la Colletta per la Birra non finisce fra i prenotabili", () => {
  const services = [
    { code: "pool_60", mode: "pool" },
    { code: "birra", mode: LISTINO_MODE },
    { code: "group_45", mode: "group" },
  ];
  assert.deepEqual(
    onlyBookable(services).map((s) => s.code),
    ["pool_60", "group_45"],
  );
});
