import { test } from "node:test";
import assert from "node:assert/strict";
import { livelloLibero } from "./intake";

test("livelloLibero — Base", () => {
  assert.equal(livelloLibero({ corsi: "mai", stili: [], autovalutazione: 1 }), "Base");
  assert.equal(
    livelloLibero({ corsi: "mai", stili: ["nessuno"], autovalutazione: 2 }),
    "Base",
  );
});

test("livelloLibero — Intermedio", () => {
  // corsi bambino(1) + 1 stile(1) + autoval 3(1) = 3
  assert.equal(
    livelloLibero({ corsi: "bambino", stili: ["SL"], autovalutazione: 3 }),
    "Intermedio",
  );
});

test("livelloLibero — Avanzato", () => {
  // sempre(2) + 3 stili(2) + autoval 5(2) = 6
  assert.equal(
    livelloLibero({
      corsi: "sempre",
      stili: ["SL", "DS", "RA"],
      autovalutazione: 5,
    }),
    "Avanzato",
  );
});

test("livelloLibero — input mancanti → Base", () => {
  assert.equal(livelloLibero({}), "Base");
});
