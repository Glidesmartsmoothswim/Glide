// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { test } from "node:test";
import assert from "node:assert/strict";
import { monthsCovered, monthlyEquivalent, mrrOf, isGifted } from "./mrr";
import { seasonWindow, seasonEnd } from "./pricing";

// I tre abbonati realmente attivi al 12/09/2026, coi dati che hanno a DB.
// Sono il caso che ha fatto sbagliare l'MRR, quindi restano il test di
// riferimento: se questi tre numeri cambiano, è cambiato il significato.
const AMADIO = {
  tier: "one_to_one",
  payment_amount_cents: 64600, // Pacchetto Stagionale Elite 3+1/mese
  paid_at: "2026-09-03T09:18:37Z",
  tier_expires_at: "2027-06-30T23:59:59Z",
};
const BATTAGLINI = {
  tier: "one_to_one",
  payment_amount_cents: 64600,
  paid_at: "2026-09-12T12:10:23Z",
  tier_expires_at: "2027-07-11T00:00:00Z",
};
const CALABRESE = {
  tier: "open",
  payment_amount_cents: 990,
  paid_at: "2026-09-03T09:00:00Z",
  tier_expires_at: "2026-10-03T00:00:00Z",
};
const OMAGGIO = {
  tier: "open_plus",
  payment_amount_cents: 0,
  paid_at: null,
  tier_expires_at: "2027-06-30T23:59:59Z",
};

test("monthsCovered legge una stagione come 10 mesi, non 9", () => {
  assert.equal(monthsCovered(AMADIO.paid_at, AMADIO.tier_expires_at), 10);
  assert.equal(monthsCovered(BATTAGLINI.paid_at, BATTAGLINI.tier_expires_at), 10);
});

test("monthsCovered: un mensile è 1 mese", () => {
  assert.equal(monthsCovered(CALABRESE.paid_at, CALABRESE.tier_expires_at), 1);
});

test("monthsCovered: date assenti, illeggibili o invertite → null", () => {
  assert.equal(monthsCovered(null, "2027-06-30T00:00:00Z"), null);
  assert.equal(monthsCovered("2026-09-03T00:00:00Z", null), null);
  assert.equal(monthsCovered("non-una-data", "2027-06-30T00:00:00Z"), null);
  // Scadenza prima dell'incasso: dato incoerente, non "meno di un mese".
  assert.equal(monthsCovered("2027-06-30T00:00:00Z", "2026-09-03T00:00:00Z"), null);
});

test("una stagione prepagata vale 64,60€/mese, non i 79€ di listino", () => {
  const m = monthlyEquivalent(AMADIO);
  assert.equal(m.cents, 6460);
  assert.equal(m.estimated, false);
  assert.equal(m.months, 10);
});

test("un mensile vale il suo importo", () => {
  assert.deepEqual(monthlyEquivalent(CALABRESE), {
    cents: 990,
    estimated: false,
    months: 1,
  });
});

test("l'omaggio non genera MRR e non è una stima", () => {
  assert.ok(isGifted(OMAGGIO));
  assert.deepEqual(monthlyEquivalent(OMAGGIO), {
    cents: 0,
    estimated: false,
    months: null,
  });
});

test("importo noto senza date: si usa l'importo, dichiarato come stima", () => {
  const m = monthlyEquivalent({
    tier: "one_to_one",
    payment_amount_cents: 8400,
    paid_at: null,
    tier_expires_at: null,
  });
  assert.deepEqual(m, { cents: 8400, estimated: true, months: null });
});

test("nessun dato contabile: listino, ma dichiarato stima", () => {
  const m = monthlyEquivalent({
    tier: "open_plus",
    payment_amount_cents: null,
    paid_at: null,
    tier_expires_at: null,
  });
  assert.deepEqual(m, { cents: 1290, estimated: true, months: null });
});

test("tier sconosciuto senza importo non inventa un ricavo", () => {
  assert.equal(
    monthlyEquivalent({
      tier: "qualcosa_di_nuovo",
      payment_amount_cents: null,
      paid_at: null,
      tier_expires_at: null,
    }).cents,
    0,
  );
});

test("MRR del parco clienti reale: 139,10€, non 167,90€", () => {
  const b = mrrOf([AMADIO, BATTAGLINI, CALABRESE, OMAGGIO]);
  // 64,60 + 64,60 + 9,90 — l'omaggio resta fuori.
  assert.equal(b.cents, 13910);
  assert.equal(b.paying, 3);
  assert.equal(b.gifted, 1);
  assert.equal(b.estimated, 0);
});

test("MRR di un insieme vuoto è zero, non NaN", () => {
  assert.deepEqual(mrrOf([]), {
    cents: 0,
    paying: 0,
    gifted: 0,
    estimated: 0,
  });
});

test("stagione contabile: 1 luglio → 30 giugno, e chiude dove chiude seasonEnd", () => {
  const s = seasonWindow(new Date("2026-09-12T10:00:00Z"));
  assert.equal(s.label, "2026/27");
  assert.equal(s.start.toISOString(), "2026-07-01T00:00:00.000Z");
  assert.equal(s.end.toISOString(), seasonEnd(new Date("2026-09-12T10:00:00Z")).toISOString());
});

test("stagione contabile: la vendita del 31 agosto ci sta dentro", () => {
  // È il caso che ha fatto nascere questa finestra: la lezione Testai del
  // 31/08/2026 è "da inizio stagione" per il coach, e con un inizio al 1
  // settembre sarebbe caduta fuori dal totale di stagione.
  const s = seasonWindow(new Date("2026-09-12T10:00:00Z"));
  const vendita = new Date("2026-08-31T09:00:00Z");
  assert.ok(vendita >= s.start && vendita <= s.end);
});

test("stagione contabile: luglio è pre-stagione, apre quella nuova", () => {
  // Coerente con seasonEnrollment: a luglio si incassa per la stagione che
  // deve iniziare, non per quella appena chiusa.
  const s = seasonWindow(new Date("2027-07-15T10:00:00Z"));
  assert.equal(s.label, "2027/28");
  assert.equal(s.start.toISOString(), "2027-07-01T00:00:00.000Z");
});

test("stagione contabile: giugno appartiene alla stagione che si chiude", () => {
  const s = seasonWindow(new Date("2027-06-15T10:00:00Z"));
  assert.equal(s.label, "2026/27");
  assert.equal(s.start.toISOString(), "2026-07-01T00:00:00.000Z");
});

test("stagione contabile: l'etichetta tiene il decennio", () => {
  assert.equal(seasonWindow(new Date("2029-10-01T00:00:00Z")).label, "2029/30");
  assert.equal(seasonWindow(new Date("2030-01-01T00:00:00Z")).label, "2029/30");
});
