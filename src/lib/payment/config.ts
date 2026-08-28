/**
 * ADR-014 — parametri del gate ad accesso a degrado progressivo.
 * Cablati come config (stesso pattern di BOOKING in lib/booking/config.ts),
 * cambiabili da env senza toccare il codice.
 */
export const PAYMENT_GATE = {
  /** Giorni di grazia dopo la scadenza: accesso invariato, solo banner + digest. */
  graceDays: Number(process.env.PAYMENT_GRACE_DAYS ?? 5),
} as const;

/**
 * Coordinate di bonifico mostrate nell'email di attivazione (ADR-014 A.3).
 * Opzionali: se assenti, l'email/il messaggio in-app chiede di contattare il
 * coach per le coordinate — nessun crash, stesso spirito di flags.ts.
 */
export function bankTransferDetails() {
  const iban = process.env.PAYMENT_BANK_IBAN?.trim() || null;
  const holder = process.env.PAYMENT_BANK_HOLDER?.trim() || null;
  return iban && holder ? { iban, holder } : null;
}
