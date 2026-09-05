import { test } from "node:test";
import assert from "node:assert/strict";
import {
  derivePaymentGate,
  daysExpired,
  hasFullAccess,
  effectiveTierFor,
  GATE_ACCESS,
  DEFAULT_GRACE_DAYS,
  type PaymentInput,
} from "./status";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-09-05T12:00:00Z");
const at = (daysFromNow: number) =>
  new Date(NOW.getTime() + daysFromNow * DAY).toISOString();

const GRACE = DEFAULT_GRACE_DAYS;

/** Profilo pagante in regola, da modificare caso per caso. */
const paying = (over: Partial<PaymentInput> = {}): PaymentInput => ({
  tier: "open_plus",
  payment_status: "paid",
  paid_at: at(-30),
  tier_expires_at: at(10),
  ...over,
});

// ── I sei rami del contratto, nell'ordine esatto ────────────────────────

test("free → not_applicable, qualunque sia il resto (primo match vince)", () => {
  assert.equal(
    derivePaymentGate({ tier: "free", payment_status: null, paid_at: null, tier_expires_at: null }, GRACE, NOW),
    "not_applicable",
  );
  // anche con una scadenza sfondata da mesi: il gate non si applica ai free.
  assert.equal(
    derivePaymentGate({ tier: "free", payment_status: "paid", paid_at: at(-400), tier_expires_at: at(-365) }, GRACE, NOW),
    "not_applicable",
  );
});

test("payment_status diverso da 'paid' → due (precede ogni ragionamento sulle date)", () => {
  assert.equal(derivePaymentGate(paying({ payment_status: "pending_payment" }), GRACE, NOW), "due");
  // IL BUG DI ADR-016: tier pagante con payment_status nullo. Prima cadeva
  // su "ok" perché il vecchio gate guardava solo tier_expires_at.
  assert.equal(derivePaymentGate(paying({ payment_status: null }), GRACE, NOW), "due");
  assert.equal(
    derivePaymentGate({ tier: "one_to_one", payment_status: null, paid_at: null, tier_expires_at: null }, GRACE, NOW),
    "due",
  );
});

test("pagante senza scadenza → due (dato incoerente, non accesso pieno)", () => {
  assert.equal(derivePaymentGate(paying({ tier_expires_at: null }), GRACE, NOW), "due");
  // data illeggibile = stessa classe di incoerenza.
  assert.equal(derivePaymentGate(paying({ tier_expires_at: "non-una-data" }), GRACE, NOW), "due");
});

test("scadenza nel futuro → paid", () => {
  assert.equal(derivePaymentGate(paying({ tier_expires_at: at(1) }), GRACE, NOW), "paid");
  assert.equal(derivePaymentGate(paying({ tier_expires_at: at(365) }), GRACE, NOW), "paid");
  // un secondo prima della scadenza è ancora dentro il periodo pagato.
  assert.equal(
    derivePaymentGate(paying({ tier_expires_at: new Date(NOW.getTime() + 1000).toISOString() }), GRACE, NOW),
    "paid",
  );
});

test("scaduto da ≤ graceDays → grace (confine incluso)", () => {
  assert.equal(derivePaymentGate(paying({ tier_expires_at: at(0) }), GRACE, NOW), "grace");
  assert.equal(derivePaymentGate(paying({ tier_expires_at: at(-1) }), GRACE, NOW), "grace");
  assert.equal(derivePaymentGate(paying({ tier_expires_at: at(-GRACE) }), GRACE, NOW), "grace");
});

test("scaduto da > graceDays → overdue (il giorno dopo il confine)", () => {
  assert.equal(derivePaymentGate(paying({ tier_expires_at: at(-(GRACE + 1)) }), GRACE, NOW), "overdue");
  assert.equal(derivePaymentGate(paying({ tier_expires_at: at(-10) }), GRACE, NOW), "overdue");
  assert.equal(derivePaymentGate(paying({ tier_expires_at: at(-90) }), GRACE, NOW), "overdue");
});

// ── Confine esatto, al variare di graceDays ─────────────────────────────

test("il confine si sposta con graceDays (parametro, non costante nascosta)", () => {
  const expiredBy8 = paying({ tier_expires_at: at(-8) });
  assert.equal(derivePaymentGate(expiredBy8, 7, NOW), "overdue");
  assert.equal(derivePaymentGate(expiredBy8, 8, NOW), "grace");
  // graceDays = 0: nessuna grazia oltre il giorno stesso della scadenza.
  assert.equal(derivePaymentGate(paying({ tier_expires_at: at(0) }), 0, NOW), "grace");
  assert.equal(derivePaymentGate(paying({ tier_expires_at: at(-1) }), 0, NOW), "overdue");
});

test("giorno parziale: 23h59 di ritardo contano 0 giorni, restano dentro la grazia", () => {
  const almostADay = new Date(NOW.getTime() - (DAY - 60_000)).toISOString();
  assert.equal(derivePaymentGate(paying({ tier_expires_at: almostADay }), 0, NOW), "grace");
});

// ── Override del coach (ADR-016: la leva È tier_expires_at) ─────────────

test("override coach: spostare tier_expires_at avanti riporta il gate a paid, senza altre colonne", () => {
  const overdue = paying({ tier_expires_at: at(-30) });
  assert.equal(derivePaymentGate(overdue, GRACE, NOW), "overdue");
  const moved = { ...overdue, tier_expires_at: at(3650) };
  assert.equal(derivePaymentGate(moved, GRACE, NOW), "paid");
});

// ── daysExpired ─────────────────────────────────────────────────────────

test("daysExpired — 0 se non scaduto/assente/illeggibile, altrimenti giorni interi", () => {
  assert.equal(daysExpired(null, NOW), 0);
  assert.equal(daysExpired(undefined, NOW), 0);
  assert.equal(daysExpired("non-una-data", NOW), 0);
  assert.equal(daysExpired(at(5), NOW), 0);
  assert.equal(daysExpired(at(-3), NOW), 3);
});

// ── Mappa permessi ──────────────────────────────────────────────────────

test("GATE_ACCESS — pieno per paid/grace/not_applicable, ridotto a Base per due/overdue", () => {
  assert.equal(hasFullAccess("paid"), true);
  assert.equal(hasFullAccess("grace"), true);
  assert.equal(hasFullAccess("not_applicable"), true);
  assert.equal(hasFullAccess("due"), false);
  assert.equal(hasFullAccess("overdue"), false);

  // grace = accesso pieno MA banner di promemoria rinnovo.
  assert.equal(GATE_ACCESS.grace.renewalBanner, true);
  assert.equal(GATE_ACCESS.paid.renewalBanner, false);
  // schermata bloccante: rinnovo per overdue, pagamento per due.
  assert.equal(GATE_ACCESS.overdue.screen, "renew");
  assert.equal(GATE_ACCESS.due.screen, "pay");
  assert.equal(GATE_ACCESS.paid.screen, null);
  assert.equal(GATE_ACCESS.grace.screen, null);
  assert.equal(GATE_ACCESS.not_applicable.screen, null);
});

test("effectiveTierFor — collassa su free solo quando il gate non eroga", () => {
  assert.equal(effectiveTierFor("open_plus", "paid", "free"), "open_plus");
  assert.equal(effectiveTierFor("open_plus", "grace", "free"), "open_plus");
  assert.equal(effectiveTierFor("open_plus", "overdue", "free"), "free");
  assert.equal(effectiveTierFor("open_plus", "due", "free"), "free");
  assert.equal(effectiveTierFor("free", "not_applicable", "free"), "free");
});

test("default graceDays = 7 (ADR-016, in attesa di conferma commerciale)", () => {
  assert.equal(DEFAULT_GRACE_DAYS, 7);
});
