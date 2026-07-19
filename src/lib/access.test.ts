import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canAccess,
  canOpenLibraryItem,
  upgradeTargetFor,
  ACCESS_MATRIX,
  TIERS,
} from "./access";

test("libreria — visibilità free accessibile a tutti", () => {
  for (const t of TIERS) assert.equal(canOpenLibraryItem(t, "free"), true);
});

test("libreria — visibilità open: free esclusa, gli altri dentro", () => {
  assert.equal(canOpenLibraryItem("free", "open"), false);
  assert.equal(canOpenLibraryItem("open", "open"), true);
  assert.equal(canOpenLibraryItem("open_plus", "open"), true);
  assert.equal(canOpenLibraryItem("one_to_one", "open"), true);
});

test("libreria — visibilità open_plus: solo open_plus e one_to_one", () => {
  assert.equal(canOpenLibraryItem("free", "open_plus"), false);
  assert.equal(canOpenLibraryItem("open", "open_plus"), false);
  assert.equal(canOpenLibraryItem("open_plus", "open_plus"), true);
  assert.equal(canOpenLibraryItem("one_to_one", "open_plus"), true);
});

test("libreria — visibilità one_to_one: solo one_to_one", () => {
  assert.equal(canOpenLibraryItem("free", "one_to_one"), false);
  assert.equal(canOpenLibraryItem("open", "one_to_one"), false);
  assert.equal(canOpenLibraryItem("open_plus", "one_to_one"), false);
  assert.equal(canOpenLibraryItem("one_to_one", "one_to_one"), true);
});

test("Canale Open settimana — solo open e open_plus (NON free, NON one_to_one)", () => {
  assert.equal(canAccess("free", "open:week"), false);
  assert.equal(canAccess("open", "open:week"), true);
  assert.equal(canAccess("open_plus", "open:week"), true);
  assert.equal(canAccess("one_to_one", "open:week"), false);
});

test("Canale Open archivio storico — solo open_plus", () => {
  assert.equal(canAccess("free", "open:archive"), false);
  assert.equal(canAccess("open", "open:archive"), false);
  assert.equal(canAccess("open_plus", "open:archive"), true);
  assert.equal(canAccess("one_to_one", "open:archive"), false);
});

test("eventi e profilo — tutti i tier", () => {
  for (const t of TIERS) {
    assert.equal(canAccess(t, "events:book"), true);
    assert.equal(canAccess(t, "profile"), true);
  }
});

test("upgradeTargetFor — invito al tier minimo che sblocca", () => {
  assert.equal(upgradeTargetFor("free"), null);
  assert.equal(upgradeTargetFor("open"), "open");
  assert.equal(upgradeTargetFor("open_plus"), "open_plus");
  assert.equal(upgradeTargetFor("one_to_one"), "one_to_one");
});

test("matrice — nessuna risorsa vuota, tier validi", () => {
  for (const [res, tiers] of Object.entries(ACCESS_MATRIX)) {
    assert.ok(tiers.length > 0, `${res} non deve essere vuota`);
    for (const t of tiers) assert.ok(TIERS.includes(t), `${t} tier valido`);
  }
});
