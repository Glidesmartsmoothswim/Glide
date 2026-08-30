import { test } from "node:test";
import assert from "node:assert/strict";
import {
  eliteMonthlyPriceCents,
  eliteTotalPriceCents,
  ELITE_ENTRY_PRICE_CENTS,
} from "./elite-pricing";

// Verifica sullo storico reale (GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md v5):
// 4 allenamenti/sett, prezzi bimestrali storici — 140€/bim (lezione),
// 130€/bim (call). La formula (Asse A) sconta di 2€/mese rispetto al
// reale storico: 68€/mese (136€/bim) e 63€/mese (126€/bim), scostamento
// consapevole documentato nella nota sorgente.

test("elite pricing — 4 all. + lezione/bimestre = 68€/mese (136€/bim, storico reale 140€/bim)", () => {
  assert.equal(
    eliteMonthlyPriceCents({ allenamenti: 4, cadenza: "bimestrale", canale: "presenza" }),
    6800,
  );
});

test("elite pricing — 4 all. + call/bimestre = 63€/mese (126€/bim, storico reale 130€/bim)", () => {
  assert.equal(
    eliteMonthlyPriceCents({ allenamenti: 4, cadenza: "bimestrale", canale: "remoto" }),
    6300,
  );
});

test("elite pricing — entry price (2 all. + call/bimestre, v5 nuovo floor) = 46€/mese", () => {
  assert.equal(
    eliteMonthlyPriceCents({ allenamenti: 2, cadenza: "bimestrale", canale: "remoto" }),
    4600,
  );
  assert.equal(ELITE_ENTRY_PRICE_CENTS, 4600);
});

test("elite pricing — 2 all. + lezione/bimestre = 51€/mese", () => {
  assert.equal(
    eliteMonthlyPriceCents({ allenamenti: 2, cadenza: "bimestrale", canale: "presenza" }),
    5100,
  );
});

test("elite pricing — 3 all. + call/bimestre = 55€/mese (non più l'entry, resta in matrice)", () => {
  assert.equal(
    eliteMonthlyPriceCents({ allenamenti: 3, cadenza: "bimestrale", canale: "remoto" }),
    5500,
  );
});

test("elite pricing — 3 all. + lezione/bimestre = 60€/mese", () => {
  assert.equal(
    eliteMonthlyPriceCents({ allenamenti: 3, cadenza: "bimestrale", canale: "presenza" }),
    6000,
  );
});

test("elite pricing — 7 allenamenti/sett (nuovo scaglione v3) = 70€ canone", () => {
  assert.equal(
    eliteMonthlyPriceCents({ allenamenti: 7, cadenza: "bimestrale", canale: "remoto" }),
    8100, // 70€ canone + 11€ credito call/bimestre
  );
});

test("elite pricing — settimanale ricalcolata su 4 lezioni/mese fisse (v3, era 108/75€)", () => {
  assert.equal(
    eliteMonthlyPriceCents({ allenamenti: 3, cadenza: "settimanale", canale: "presenza" }),
    4400 + 11300,
  );
  assert.equal(
    eliteMonthlyPriceCents({ allenamenti: 3, cadenza: "settimanale", canale: "remoto" }),
    4400 + 7700,
  );
});

test("elite pricing — fatturazione bimestrale raddoppia l'importo, non il mensile-equivalente", () => {
  const sel = { allenamenti: 4, cadenza: "mensile", canale: "presenza" } as const;
  const monthly = eliteMonthlyPriceCents(sel);
  assert.equal(eliteTotalPriceCents(sel, "mensile"), monthly);
  assert.equal(eliteTotalPriceCents(sel, "bimestrale"), monthly * 2);
});
