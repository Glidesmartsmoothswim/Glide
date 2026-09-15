// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeBlocks, woMeters, type Block } from "./workout";
import { canEditWorkout } from "./config";

test("igiene — le righe vuote non arrivano in tabella", () => {
  const [b] = sanitizeBlocks([
    { z: "Z1", name: "Riscaldamento", rounds: 1, lines: ["200 SL pinne", "", "  ", "4x50 MX"] },
  ]);
  assert.deepEqual(b.lines, ["200 SL pinne", "4x50 MX"]);
});

test("igiene — il nome del blocco perde gli spazi ai bordi", () => {
  const [b] = sanitizeBlocks([
    { z: "Z1", name: "Defaticamento ", rounds: 1, lines: ["100 sciolti "] },
  ]);
  assert.equal(b.name, "Defaticamento");
  // La riga resta quella del coach, solo senza lo spazio finale.
  assert.deepEqual(b.lines, ["100 sciolti"]);
});

test("igiene — un blocco senza righe, nome e nota sparisce", () => {
  assert.equal(sanitizeBlocks([{ z: "Z2", name: "  ", rounds: 1, lines: ["", " "] }]).length, 0);
  // Un blocco con il solo nome resta: il coach lo sta ancora scrivendo.
  assert.equal(sanitizeBlocks([{ z: "Z2", name: "Soglia", rounds: 1, lines: [] }]).length, 1);
});

test("igiene — nota vuota fuori dal JSONB, nota piena dentro", () => {
  assert.equal("note" in sanitizeBlocks([
    { z: "Z2", name: "Set", rounds: 1, lines: ["100"], note: "   " },
  ])[0], false);
  assert.equal(
    sanitizeBlocks([{ z: "Z2", name: "Set", rounds: 1, lines: ["100"], note: " occhio al ritmo " }])[0]
      .note,
    "occhio al ritmo",
  );
});

test("igiene — rounds sotto 1 o non numerico torna a 1", () => {
  assert.equal(sanitizeBlocks([{ z: "Z2", name: "x", rounds: 0, lines: ["100"] }])[0].rounds, 1);
  assert.equal(
    sanitizeBlocks([{ z: "Z2", name: "x", rounds: "tre" as unknown as number, lines: ["100"] }])[0]
      .rounds,
    1,
  );
});

test("igiene — input non valido non fa esplodere niente", () => {
  assert.deepEqual(sanitizeBlocks(null), []);
  assert.deepEqual(sanitizeBlocks("[]"), []);
  assert.deepEqual(sanitizeBlocks([null, 3, "x"]), []);
});

test("metri — l'igiene non cambia il totale (le righe vuote valgono 0)", () => {
  const sporchi = [
    { z: "Z1", name: "Riscaldamento ", rounds: 3, lines: ["100 SL pinne", "", "2x50 MX"] },
  ] as Block[];
  assert.equal(woMeters(sanitizeBlocks(sporchi)), woMeters(sporchi));
  assert.equal(woMeters(sanitizeBlocks(sporchi)), 3 * (100 + 100));
});

test("metri — il parser NON legge la distanza fuori da inizio riga", () => {
  // È il caso che impone il fallback sul total_meters dell'originale in copia:
  // qui il ricalcolo dà 0 e 400, non 200 e 2000.
  assert.equal(woMeters([{ z: "Z2", name: "", rounds: 1, lines: ["Risc 200 m"] }]), 200);
  assert.equal(
    woMeters([
      { z: "Z2", name: "", rounds: 1, lines: ["200 Pinne 50 Stile 50 Dorso 500 Dorso Doppio"] },
    ]),
    200,
  );
});

test("finestra di modifica — una bozza non scade mai", () => {
  const trentaGiorniFa = new Date(Date.now() - 30 * 86_400_000).toISOString();
  assert.equal(canEditWorkout(null, trentaGiorniFa), true);
  assert.equal(canEditWorkout(undefined, trentaGiorniFa), true);
  // Pubblicata: la finestra dei 14 giorni resta quella di prima.
  assert.equal(canEditWorkout(trentaGiorniFa, trentaGiorniFa), false);
  assert.equal(canEditWorkout(new Date().toISOString(), trentaGiorniFa), true);
});
