import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MANUAL_PAYMENT_METHODS,
  isManualPaymentMethod,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_CHOICE,
} from "./methods";

test("i metodi manuali sono esattamente quelli che il vincolo DB vuole con stato", () => {
  // Se questo elenco cambia, va cambiato anche `payment_status_coherent`
  // (migration_054): sono la stessa regola scritta due volte, ed è la deriva
  // fra le due che ha prodotto il bug di M3.
  assert.deepEqual([...MANUAL_PAYMENT_METHODS], ["bank_transfer", "cash"]);
});

test("isManualPaymentMethod accetta solo gli incassi fuori piattaforma", () => {
  assert.equal(isManualPaymentMethod("bank_transfer"), true);
  assert.equal(isManualPaymentMethod("cash"), true);
  for (const v of ["credit", "token", "free", "stripe", "", null, undefined, 7])
    assert.equal(isManualPaymentMethod(v), false, `${String(v)} non è manuale`);
});

test("ogni metodo ha etichetta e copy di scelta, senza buchi", () => {
  for (const m of MANUAL_PAYMENT_METHODS) {
    assert.ok(PAYMENT_METHOD_LABEL[m]?.length, `manca l'etichetta di ${m}`);
    assert.ok(PAYMENT_METHOD_CHOICE[m]?.title.length, `manca il titolo di ${m}`);
    assert.ok(PAYMENT_METHOD_CHOICE[m]?.hint.length, `manca l'aiuto di ${m}`);
  }
});
