import { test } from "node:test";
import assert from "node:assert/strict";
import { describePaymentWriteError, columnFromConstraint } from "./errors";

test("columnFromConstraint — ricava la colonna dal nome del vincolo", () => {
  assert.equal(
    columnFromConstraint(
      'new row for relation "profiles" violates check constraint "profiles_payment_method_check"',
    ),
    "payment_method",
  );
  assert.equal(
    columnFromConstraint('violates check constraint "bookings_payment_method_check"'),
    "payment_method",
  );
  // Vincolo con nome proprio, non <tabella>_<colonna>_check.
  assert.equal(
    columnFromConstraint('violates check constraint "tier_needs_payment_status"'),
    "tier_needs_payment_status",
  );
  assert.equal(columnFromConstraint(null), null);
  assert.equal(columnFromConstraint("errore senza vincolo"), null);
});

test("23514 — CHECK violato: messaggio che nomina la colonna", () => {
  const f = describePaymentWriteError({
    code: "23514",
    message:
      'new row for relation "profiles" violates check constraint "profiles_payment_method_check"',
  });
  assert.equal(f.code, "23514");
  assert.equal(f.column, "payment_method");
  assert.equal(f.message, "Valore non ammesso dal database: payment_method.");
});

test("23514 senza vincolo riconoscibile: resta esplicito, non generico", () => {
  const f = describePaymentWriteError({ code: "23514", message: "boom" });
  assert.equal(f.column, null);
  assert.equal(f.message, "Valore non ammesso dal database.");
});

test("42501 — il trigger protect_payment_columns ha rifiutato la scrittura", () => {
  const f = describePaymentWriteError({
    code: "42501",
    message: "Modifica dello stato di pagamento non consentita.",
  });
  assert.match(f.message, /permessi insufficienti/);
});

test("23502 — campo obbligatorio mancante", () => {
  const f = describePaymentWriteError({
    code: "23502",
    message: 'null value in column "x" violates not-null constraint',
    details: 'constraint "profiles_tier_expires_at_check"',
  });
  assert.equal(f.column, "tier_expires_at");
  assert.match(f.message, /Campo obbligatorio mancante: tier_expires_at/);
});

test("codice ignoto: passa il messaggio del DB, mai un generico 'riprova'", () => {
  const f = describePaymentWriteError({ code: "XX000", message: "qualcosa è esploso" });
  assert.equal(f.message, "qualcosa è esploso");
});

test("errore assente o senza messaggio: comunque una frase, mai stringa vuota", () => {
  assert.equal(
    describePaymentWriteError(null).message,
    "Scrittura sui pagamenti non riuscita.",
  );
  assert.equal(
    describePaymentWriteError({ code: null, message: "   " }).message,
    "Scrittura sui pagamenti non riuscita.",
  );
});
