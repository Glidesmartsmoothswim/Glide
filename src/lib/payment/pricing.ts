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
 * Fine della stagione 1:1 in corso (o della prossima, se si è fuori
 * stagione): sempre il 30 giugno più vicino che non sia già passato.
 * Luglio/agosto sono gli unici mesi FUORI stagione (Sett→Giu, 10 mesi
 * effettivi) — per quei due mesi questa funzione punta già al 30 giugno
 * della stagione che deve ancora iniziare.
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
 * un'iscrizione ANTICIPATA (luglio/agosto, prima dell'inizio stagione) è
 * una data FISSA di calendario (31/08 dell'anno successivo alla
 * richiesta), mai "data pagamento + 10 mesi": un prepagamento a fine
 * agosto non deve spostare silenziosamente la scadenza né far scattare un
 * undicesimo mese. Coerente con la finestra di recupero sospensione (fino
 * al 31/08, doc §Sospensione). Usata SOLO per l'iscrizione anticipata —
 * per chi si iscrive a stagione già iniziata vedi seasonEnrollment sotto.
 */
export function seasonExpiryDate(from = new Date()): Date {
  const y = from.getUTCFullYear();
  return new Date(Date.UTC(y + 1, 7, 31, 23, 59, 59));
}

export type SeasonEnrollment = {
  /** true = luglio/agosto, iscrizione ANTICIPATA prima dell'inizio stagione. */
  isPreSeason: boolean;
  /** Mesi da pagare: fisso 10 se anticipata, altrimenti i mesi restanti fino a giugno. */
  months: number;
  /** tier_expires_at: 31/08 anno successivo se anticipata, altrimenti fine giugno. */
  expiresAt: Date;
  /** Sconto prepagamento stagione: 15% (anticipata o Sett-Dic), 10% da Gennaio. */
  discount: number;
};

/**
 * PROMPT_CODE_PAGAMENTI TASK 5 addendum (01/09/2026, chiarimento utente) —
 * "iscrizione a stagione già iniziata" (chi si iscrive da Settembre in
 * poi, quando la stagione è già partita) paga solo i mesi RESTANTI fino a
 * fine giugno — non più il fisso ×10, che resta solo per chi si iscrive
 * PRIMA dell'inizio stagione (luglio/agosto, seasonExpiryDate sopra) — e
 * la scadenza è sempre fine giugno, mai il 31/08 dell'anno successivo
 * (quella finestra è solo per chi ha prepagato l'intera stagione in
 * anticipo). Lo sconto resta al 15% per chi si iscrive Sett-Dic (early
 * come l'iscrizione anticipata), scende al 10% da Gennaio in poi (meno
 * della metà stagione residua).
 */
export function seasonEnrollment(from = new Date()): SeasonEnrollment {
  const month = from.getUTCMonth() + 1; // 1-12

  if (month === 7 || month === 8) {
    return {
      isPreSeason: true,
      months: 10,
      expiresAt: seasonExpiryDate(from),
      discount: 0.15,
    };
  }

  const end = seasonEnd(from);
  const months =
    (end.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - from.getUTCMonth()) +
    1;
  return {
    isPreSeason: false,
    months,
    expiresAt: end,
    discount: month >= 9 ? 0.15 : 0.1,
  };
}

/** Scadenza del periodo che parte ORA, per il piano richiesto. */
export function expiryFor(tier: SubTier, from = new Date()): Date {
  if (tier === "one_to_one_season") return seasonEnrollment(from).expiresAt;
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}
