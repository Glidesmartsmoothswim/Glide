import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTempo, parseTempo } from "./tempo";

test("formatTempo", () => {
  assert.equal(formatTempo(3245), "32.45");
  assert.equal(formatTempo(6532), "1:05.32");
  assert.equal(formatTempo(96499), "16:04.99");
  assert.equal(formatTempo(0), "0.00");
  assert.equal(formatTempo(502), "5.02");
});

test("parseTempo — validi", () => {
  assert.equal(parseTempo("", 32, 45), 3245);
  assert.equal(parseTempo(1, 5, 32), 6532);
  assert.equal(parseTempo(16, 4, 99), 96499);
  assert.equal(parseTempo(0, 32, 45), 3245);
});

test("parseTempo — invalidi → null", () => {
  assert.equal(parseTempo(0, 60, 0), null); // sec fuori range
  assert.equal(parseTempo(0, 30, 100), null); // cent fuori range
  assert.equal(parseTempo(0, -1, 0), null); // negativo
  assert.equal(parseTempo(0, 0, 0), null); // tempo nullo
  assert.equal(parseTempo("x", 0, 0), null); // non numerico
  assert.equal(parseTempo(1.5, 0, 0), null); // non intero
});

test("round-trip format(parse)", () => {
  const cc = parseTempo(1, 5, 32);
  assert.equal(cc, 6532);
  assert.equal(formatTempo(cc!), "1:05.32");
});
