/**
 * ADR-014 — listino piani, ora usato dal flusso di attivazione manuale
 * invece che dai Price ID Stripe (rimossi con lib/stripe.ts).
 * Importi ripresi dai Price ID storici (lib/stripe.ts, ora rimosso).
 */
export type SubTier =
  | "open"
  | "open_plus"
  | "one_to_one_monthly"
  | "one_to_one_season";

// Prezzi pre-lancio (GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md v3, 30/08):
// Open 9,90€/mese, Open Plus 12,90€/mese (era 10€/12€, Sprint C.6).
export const TIER_PRICE_CENTS: Record<SubTier, number> = {
  open: 990,
  open_plus: 1290,
  one_to_one_monthly: 7900,
  one_to_one_season: 69000,
};

export const TIER_LABEL: Record<SubTier, string> = {
  open: "Open",
  open_plus: "Open+",
  one_to_one_monthly: "1:1 mensile",
  one_to_one_season: "1:1 stagionale",
};

/** Piano di accesso (profiles.tier) risultante da un piano attivato. */
export function subTierToAccessTier(
  tier: SubTier,
): "open" | "open_plus" | "one_to_one" {
  if (tier === "open") return "open";
  if (tier === "open_plus") return "open_plus";
  return "one_to_one";
}

/** true per i piani mensili ricorrenti (periodo = 1 mese da paid_at). */
export function isMonthly(tier: SubTier): boolean {
  return tier !== "one_to_one_season";
}

/**
 * Stagione allenamenti 1:1: Settembre → fine Giugno (10 mesi effettivi).
 * Usata SOLO per la copy ("fino a fine giugno"): il prezzo/scadenza non ne
 * dipendono più, vedi seasonExpiryDate sotto (TASK 5, GLIDE_HANDOFF_
 * PREZZI_FATTURAZIONE.md v7 §Stagione fissa a 10 mesi).
 */
export function seasonEnd(now = new Date()): Date {
  const y = now.getUTCFullYear();
  const june30 = Date.UTC(y, 5, 30, 23, 59, 59);
  return now.getTime() <= june30
    ? new Date(june30)
    : new Date(Date.UTC(y + 1, 5, 30, 23, 59, 59));
}

/**
 * PROMPT_CODE_PAGAMENTI TASK 5 (01/09/2026) — `tier_expires_at` per
 * `one_to_one_season` è una data FISSA di calendario (31/08 dell'anno
 * successivo alla richiesta), mai "data pagamento + 10 mesi": un
 * prepagamento anticipato nella seconda metà di agosto non deve spostare
 * silenziosamente la scadenza né far scattare un undicesimo mese. Coerente
 * con la finestra di recupero sospensione (fino al 31/08, doc §Sospensione).
 */
export function seasonExpiryDate(from = new Date()): Date {
  const y = from.getUTCFullYear();
  return new Date(Date.UTC(y + 1, 7, 31, 23, 59, 59));
}

/** Scadenza del periodo che parte ORA, per il piano richiesto. */
export function expiryFor(tier: SubTier, from = new Date()): Date {
  if (tier === "one_to_one_season") return seasonExpiryDate(from);
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}
