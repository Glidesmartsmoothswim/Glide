/**
 * ADR-016 / PROMPT_CODE_PAGAMENTI Task 4 — errori di scrittura sui pagamenti,
 * resi leggibili e SEMPRE visibili.
 *
 * Regola vincolante del prompt: «Un update che fallisce deve produrre un
 * errore visibile all'utente. Il bug che stiamo correggendo è sopravvissuto
 * perché falliva in silenzio.» Questo modulo è il punto unico che traduce
 * l'errore Postgres in una frase leggibile e ne lascia traccia nei log del
 * server.
 *
 * Puro e senza I/O tranne il log: testabile senza mock.
 */

/** Forma minima di un errore PostgREST/Postgres, senza dipendere dal client. */
export interface PgErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

export interface PaymentWriteFailure {
  /** SQLSTATE, se presente (es. "23514" = CHECK violato). */
  code: string | null;
  /** Colonna dedotta dal nome del vincolo, se deducibile. */
  column: string | null;
  /** Frase pronta per la UI. Mai vuota. */
  message: string;
}

/**
 * Colonna coinvolta, dedotta dal nome del vincolo citato nell'errore.
 * Postgres scrive: `... violates check constraint "profiles_payment_method_check"`.
 * Da lì si ricava `payment_method` togliendo il nome tabella e il suffisso.
 */
export function columnFromConstraint(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/constraint "([a-z0-9_]+)"/i);
  if (!m) return null;
  const name = m[1]
    .replace(/^(profiles|bookings|package_purchases|lesson_tokens)_/, "")
    .replace(/_check$/, "");
  return name || null;
}

/**
 * Traduce l'errore in messaggio leggibile. `23514` (CHECK violato) è il caso
 * che il prompt cita esplicitamente: è quello che scatta se si prova a
 * scrivere un valore che il DB non ammette — per esempio `bank_transfer` su
 * `payment_method` finché il vincolo non è stato allargato a mano.
 */
export function describePaymentWriteError(
  error: PgErrorLike | null | undefined,
): PaymentWriteFailure {
  const code = error?.code ?? null;
  const raw = [error?.message, error?.details].filter(Boolean).join(" — ");
  const column = columnFromConstraint(raw);

  if (code === "23514")
    return {
      code,
      column,
      message: column
        ? `Valore non ammesso dal database: ${column}.`
        : "Valore non ammesso dal database.",
    };

  if (code === "23502")
    return {
      code,
      column,
      message: column
        ? `Campo obbligatorio mancante: ${column}.`
        : "Campo obbligatorio mancante.",
    };

  // Il trigger protect_payment_columns (migration_043) alza 42501 quando la
  // scrittura non arriva né da un coach né dal service-role.
  if (code === "42501")
    return {
      code,
      column,
      message:
        "Il database ha rifiutato la modifica dello stato di pagamento: permessi insufficienti.",
    };

  return {
    code,
    column,
    message: error?.message?.trim() || "Scrittura sui pagamenti non riuscita.",
  };
}

/**
 * Come sopra, ma lascia anche una riga nei log del server. Da usare in OGNI
 * punto che scrive sullo stato di pagamento: senza log, un fallimento in
 * produzione resta invisibile anche quando la UI lo mostra all'utente e
 * l'utente non lo racconta.
 */
export function reportPaymentWriteError(
  error: PgErrorLike | null | undefined,
  context: { op: string; swimmerId?: string },
): PaymentWriteFailure {
  const failure = describePaymentWriteError(error);
  console.error("[payment] scrittura fallita", {
    op: context.op,
    swimmerId: context.swimmerId,
    code: failure.code,
    column: failure.column,
    message: error?.message ?? null,
    details: error?.details ?? null,
  });
  return failure;
}
