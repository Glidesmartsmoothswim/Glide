import { test } from "node:test";
import assert from "node:assert/strict";
import {
  eliteMonthlyPriceCents,
  eliteTotalPriceCents,
  eliteSeasonQuote,
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

// PROMPT_CODE_PAGAMENTI TASK 5 (01/09/2026) — iscrizione ANTICIPATA
// (luglio/agosto, prima dell'inizio stagione): sempre ×10 mesi fissi,
// mai variabile in base alla data. Prima di questo fix un'iscrizione a
// fine agosto restituiva 11 mesi (monthsToSeasonEnd contava da "ora" a
// giugno), gonfiando l'importo di un mese intero.
test("elite pricing — iscrizione anticipata (agosto): sempre 10 mesi fissi, sconto 15% (mai un undicesimo mese)", () => {
  const sel = { allenamenti: 4, cadenza: "mensile", canale: "presenza" } as const;
  const lateAugust = new Date("2026-08-28T12:00:00Z");
  const quote = eliteSeasonQuote(sel, lateAugust);
  assert.equal(quote.months, 10);
  assert.equal(quote.discount, 0.15);
  assert.equal(quote.monthlyCents, eliteMonthlyPriceCents(sel));
  assert.equal(quote.fullCents, eliteMonthlyPriceCents(sel) * 10);
  assert.equal(
    quote.discountedCents,
    Math.round(quote.fullCents * (1 - 0.15)),
  );
});

test("elite pricing — verifica sullo storico: 3 all/sett + check-in mensile presenza, iscrizione anticipata = 646€ (Salvatore Amadio)", () => {
  const sel = { allenamenti: 3, cadenza: "mensile", canale: "presenza" } as const;
  const quote = eliteSeasonQuote(sel, new Date("2026-08-28T12:00:00Z"));
  assert.equal(quote.monthlyCents, 7600); // 44+32
  assert.equal(quote.discountedCents, 64600); // 76×10×0,85 = 646€
});

// Chiarimento utente (01/09/2026) — "iscrizione a stagione già iniziata":
// da Settembre in poi si pagano solo i mesi RESTANTI fino a fine giugno
// (non più il fisso ×10), sconto 15% se ci si iscrive Sett-Dic, 10% da
// Gennaio in poi.
test("elite pricing — stagione già iniziata a Settembre: 10 mesi restanti (Sett→Giu), sconto 15%", () => {
  const sel = { allenamenti: 4, cadenza: "mensile", canale: "presenza" } as const;
  const quote = eliteSeasonQuote(sel, new Date("2026-09-05T12:00:00Z"));
  assert.equal(quote.months, 10);
  assert.equal(quote.discount, 0.15);
});

test("elite pricing — stagione già iniziata a Dicembre: 7 mesi restanti (Dic→Giu), sconto 15%", () => {
  const sel = { allenamenti: 4, cadenza: "mensile", canale: "presenza" } as const;
  const quote = eliteSeasonQuote(sel, new Date("2026-12-10T12:00:00Z"));
  assert.equal(quote.months, 7);
  assert.equal(quote.discount, 0.15);
});

test("elite pricing — stagione già iniziata a Gennaio: 6 mesi restanti (Gen→Giu), sconto scende al 10%", () => {
  const sel = { allenamenti: 4, cadenza: "mensile", canale: "presenza" } as const;
  const quote = eliteSeasonQuote(sel, new Date("2027-01-15T12:00:00Z"));
  assert.equal(quote.months, 6);
  assert.equal(quote.discount, 0.1);
  assert.equal(quote.fullCents, eliteMonthlyPriceCents(sel) * 6);
  assert.equal(
    quote.discountedCents,
    Math.round(quote.fullCents * (1 - 0.1)),
  );
});

test("elite pricing — stagione già iniziata a Giugno: 1 mese restante (solo giugno), sconto 10%", () => {
  const sel = { allenamenti: 4, cadenza: "mensile", canale: "presenza" } as const;
  const quote = eliteSeasonQuote(sel, new Date("2027-06-10T12:00:00Z"));
  assert.equal(quote.months, 1);
  assert.equal(quote.discount, 0.1);
});
