import { test } from "node:test";
import assert from "node:assert/strict";
import {
  eliteMonthlyPriceCents,
  eliteTotalPriceCents,
  ELITE_ENTRY_PRICE_CENTS,
} from "./elite-pricing";

// Verifica sullo storico reale (GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md):
// 4 allenamenti/sett, prezzi bimestrali storici — 140€/bim (lezione),
// 130€/bim (call). Qui espressi come mensile-equivalente.

test("elite pricing — 4 all. + lezione/bimestre = 70€/mese (140€/bim storico)", () => {
  assert.equal(
    eliteMonthlyPriceCents({ allenamenti: 4, cadenza: "bimestrale", canale: "presenza" }),
    7000,
  );
});

test("elite pricing — 4 all. + call/bimestre = 65€/mese (130€/bim storico)", () => {
  assert.equal(
    eliteMonthlyPriceCents({ allenamenti: 4, cadenza: "bimestrale", canale: "remoto" }),
    6500,
  );
});

test("elite pricing — entry price (3 all. + call/bimestre) = 53€/mese", () => {
  assert.equal(
    eliteMonthlyPriceCents({ allenamenti: 3, cadenza: "bimestrale", canale: "remoto" }),
    5300,
  );
  assert.equal(ELITE_ENTRY_PRICE_CENTS, 5300);
});

test("elite pricing — 3 all. + lezione/bimestre = 58€/mese", () => {
  assert.equal(
    eliteMonthlyPriceCents({ allenamenti: 3, cadenza: "bimestrale", canale: "presenza" }),
    5800,
  );
});

test("elite pricing — fatturazione bimestrale raddoppia l'importo, non il mensile-equivalente", () => {
  const sel = { allenamenti: 4, cadenza: "mensile", canale: "presenza" } as const;
  const monthly = eliteMonthlyPriceCents(sel);
  assert.equal(eliteTotalPriceCents(sel, "mensile"), monthly);
  assert.equal(eliteTotalPriceCents(sel, "bimestrale"), monthly * 2);
});
