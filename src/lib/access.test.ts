import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canAccess,
  canBookRemote,
  canOpenLibraryItem,
  upgradeTargetFor,
  accessTier,
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

test("Canale Open archivio storico — open e open_plus (Sprint C.6: open limitato a corrente+precedente via RLS, open_plus intero)", () => {
  assert.equal(canAccess("free", "open:archive"), false);
  assert.equal(canAccess("open", "open:archive"), true);
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

test("accessTier (ADR-016) — gate che eroga: tier reale invariato", () => {
  assert.equal(accessTier({ tier: "open_plus", payment_gate: "paid" }), "open_plus");
  // grace = accesso PIENO, solo col banner di rinnovo.
  assert.equal(accessTier({ tier: "one_to_one", payment_gate: "grace" }), "one_to_one");
  assert.equal(accessTier({ tier: "free", payment_gate: "not_applicable" }), "free");
});

test("accessTier (ADR-016) — overdue: si comporta da free per il gating su NUOVO contenuto", () => {
  const p = { tier: "open_plus" as const, payment_gate: "overdue" as const };
  assert.equal(accessTier(p), "free");
  assert.equal(canAccess(accessTier(p), "open:week"), false);
  assert.equal(canOpenLibraryItem(accessTier(p), "open"), false);
  // free resta sempre accessibile: nessun contenuto "free" viene tolto.
  assert.equal(canOpenLibraryItem(accessTier(p), "free"), true);
});

// ADR-016, il caso che il vecchio gate non vedeva: tier pagante ma nessun
// pagamento registrato. Prima cadeva su "ok" (guardava solo la scadenza) e
// dava accesso pieno a chi non risulta aver pagato.
test("accessTier (ADR-016) — due: nessun pagamento registrato, ridotto a Base", () => {
  const p = { tier: "open_plus" as const, payment_gate: "due" as const };
  assert.equal(accessTier(p), "free");
  assert.equal(canAccess(accessTier(p), "open:week"), false);
  // ...ma prenotazioni ed eventi (funzioni Base) restano.
  assert.equal(canAccess(accessTier(p), "events:book"), true);
  assert.equal(canAccess(accessTier(p), "profile"), true);
});

test("matrice — nessuna risorsa vuota, tier validi", () => {
  for (const [res, tiers] of Object.entries(ACCESS_MATRIX)) {
    assert.ok(tiers.length > 0, `${res} non deve essere vuota`);
    for (const t of tiers) assert.ok(TIERS.includes(t), `${t} tier valido`);
  }
});

// Le call sono una prestazione INCLUSA nel coaching, non un prodotto a sé
// (Alessio, 05/09/2026): prenotabili solo con il percorso 1:1 davvero attivo.
test("canBookRemote — serve il percorso 1:1 attivo, non basta remote_allowed", () => {
  const oneToOne = { tier: "one_to_one" as const, payment_gate: "paid" as const };
  assert.equal(canBookRemote(oneToOne, true), true);
  // grace = ancora in regola.
  assert.equal(
    canBookRemote({ tier: "one_to_one", payment_gate: "grace" }, true),
    true,
  );

  // Il buco che questo gate chiude: un Base a cui il coach ha messo il
  // service_type 1:1 eredita remote_allowed=true da plan_entitlements, ma
  // non ha comprato nulla.
  assert.equal(canBookRemote({ tier: "free", payment_gate: "not_applicable" }, true), false);

  // Nemmeno un Open/Open+ , che pure paga.
  assert.equal(canBookRemote({ tier: "open_plus", payment_gate: "paid" }, true), false);

  // 1:1 non in regola: decade a free e perde le call finché non rientra.
  assert.equal(canBookRemote({ tier: "one_to_one", payment_gate: "overdue" }, true), false);
  assert.equal(canBookRemote({ tier: "one_to_one", payment_gate: "due" }, true), false);

  // E se il piano non prevede il remoto, il tier non basta.
  assert.equal(canBookRemote(oneToOne, false), false);
});
