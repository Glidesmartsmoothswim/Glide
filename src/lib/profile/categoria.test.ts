import { test } from "node:test";
import assert from "node:assert/strict";
import { categoriaMaster } from "./categoria";

test("categoriaMaster — fasce FIN", () => {
  // stagione 2026 fissa per determinismo
  assert.equal(categoriaMaster(2005, 2026), "U25"); // 21 anni
  assert.equal(categoriaMaster(2001, 2026), "M25"); // 25 anni
  assert.equal(categoriaMaster(1997, 2026), "M25"); // 29 anni
  assert.equal(categoriaMaster(1996, 2026), "M30"); // 30 anni
  assert.equal(categoriaMaster(1986, 2026), "M40"); // 40 anni
  assert.equal(categoriaMaster(1931, 2026), "M95+"); // 95 anni
  assert.equal(categoriaMaster(1920, 2026), "M95+"); // 106 anni
});

test("categoriaMaster — limite 25", () => {
  assert.equal(categoriaMaster(2002, 2026), "U25"); // 24 anni
  assert.equal(categoriaMaster(2001, 2026), "M25"); // 25 anni
});

test("categoriaMaster — input anomali", () => {
  assert.equal(categoriaMaster(2030, 2026), "U25"); // nato nel futuro → U25
});
