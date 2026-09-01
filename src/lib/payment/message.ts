import type { SubTier } from "./pricing";

/**
 * PROMPT_CODE_PAGAMENTI TASK 4 (01/09/2026) — "mai assumere": testo e
 * importo di ogni messaggio/QR di richiesta pagamento derivano SEMPRE da
 * `payment_amount_cents`/`requested_tier` sul profilo, mai da un calcolo a
 * formula standard applicato alla cieca (l'errore su Salvatore era nato
 * proprio da un'assunzione invece che dal dato reale). Un solo punto di
 * verità per la copy, usato ovunque si genera un messaggio o QR di
 * richiesta pagamento (email, schermata "richiedi attivazione", QR EPC).
 */
export type PaymentRequestCopy = {
  /** true = pagamento unico stagionale (one_to_one_season), false = canone mensile ricorrente. */
  isOneOff: boolean;
  headline: string;
};

export function paymentRequestCopy(
  requestedTier: SubTier | null,
): PaymentRequestCopy {
  const isOneOff = requestedTier === "one_to_one_season";
  return {
    isOneOff,
    headline: isOneOff
      ? "Pagamento unico, stagione"
      : "Canone mensile, si rinnova ogni mese",
  };
}

/** Causale fissa (TASK 4): "GLIDE - [Nome Cognome] - [ultime 6 caratteri di profiles.id]". */
export function paymentCausale(fullName: string, profileId: string): string {
  return `GLIDE - ${fullName} - ${profileId.slice(-6)}`;
}
