/**
 * Metodi con cui si salda una PRENOTAZIONE, ADR-017.
 *
 * Questo elenco è il gemello applicativo del vincolo `payment_status_coherent`
 * su `bookings` (migration_054): i metodi qui dentro sono esattamente quelli
 * che il database pretende abbiano un `payment_status`, e nessun altro.
 * Tenerli in un posto solo è la lezione di M3 — il vincolo parlava del solo
 * contante mentre `payment_method` era già stato esteso a `bank_transfer`, e
 * il bonifico veniva rifiutato dal database senza che nessuno se ne
 * accorgesse finché non lo si è cercato.
 *
 * Niente "server-only": lo legge anche la UI del nuotatore.
 * `credit`/`token`/`free` NON stanno qui: non sono incassi, non hanno stato
 * di cassa, e il vincolo li rifiuterebbe se ne avessero uno.
 */

/** Ordine deliberato: il bonifico è il metodo principale (ADR-014/016). */
export const MANUAL_PAYMENT_METHODS = ["bank_transfer", "cash"] as const;

export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export function isManualPaymentMethod(v: unknown): v is ManualPaymentMethod {
  return (
    typeof v === "string" &&
    (MANUAL_PAYMENT_METHODS as readonly string[]).includes(v)
  );
}

/** Etichetta breve, per badge e righe di registro. */
export const PAYMENT_METHOD_LABEL: Record<ManualPaymentMethod, string> = {
  bank_transfer: "Bonifico",
  cash: "Contanti",
};

/** Come lo si dice al nuotatore, che sceglie prima di aver pagato. */
export const PAYMENT_METHOD_CHOICE: Record<
  ManualPaymentMethod,
  { title: string; hint: string }
> = {
  bank_transfer: {
    title: "Bonifico",
    // ADR-018: le coordinate arrivano per email, non compaiono nell'app.
    hint: "Ti arrivano IBAN e causale per email.",
  },
  cash: {
    title: "Contanti in vasca",
    hint: "Lo sistemi direttamente con Alessio.",
  },
};
