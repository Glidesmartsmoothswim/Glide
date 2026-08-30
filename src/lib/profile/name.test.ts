import { test } from "node:test";
import assert from "node:assert/strict";
import { titleCaseName } from "./name";

test("titleCaseName — parola singola", () => {
  assert.equal(titleCaseName("marta"), "Marta");
  assert.equal(titleCaseName("MARTA"), "Marta");
});

test("titleCaseName — nome e cognome, spazi multipli, trim", () => {
  assert.equal(titleCaseName("  marta   malorgio  "), "Marta Malorgio");
});

test("titleCaseName — apostrofo e trattino come separatori", () => {
  assert.equal(titleCaseName("d'angelo"), "D'Angelo");
  assert.equal(titleCaseName("anna-maria rossi"), "Anna-Maria Rossi");
});

test("titleCaseName — cognomi con preposizione (di/de/la)", () => {
  assert.equal(titleCaseName("di maria"), "Di Maria");
  assert.equal(titleCaseName("de rossi"), "De Rossi");
});

test("titleCaseName — accenti italiani", () => {
  assert.equal(titleCaseName("niccolò"), "Niccolò");
});
