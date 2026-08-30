/**
 * Prezzario 1:1 Elite — GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md v3 (30/08/2026).
 * Due assi indipendenti, sommati per il prezzo mensile-equivalente:
 *
 *  - Asse A — canone allenamenti/settimana (programmazione scritta),
 *    floor a 3 (chi chiede meno paga comunque 3). Formula: A(3)=44€,
 *    A(n) = A(3) + Σ(12−k) per k=4..n — delta decrescente di 1€/scaglione.
 *  - Asse B — credito check-in, due binari per canale (in presenza / remoto),
 *    cadenza scelta dall'atleta (bimestre/mese/bisettimanale/settimana).
 *    Formula: P0 = 32€ presenza / 22€ call a cadenza mensile; ≤ mensile
 *    stesso prezzo/lezione, > mensile prezzo/lezione = P0 × (1 − 6% ×
 *    raddoppi). Settimanale calcolata su 4 lezioni/mese fisse (non 4,33
 *    reali — decisione aperta #1 del doc, nessun nuovo period-type).
 *
 * Videoanalisi resta prodotto standalone (100€), non entra qui.
 *
 * `seasonEnd` importata da ./pricing: stessa convenzione di fine stagione
 * (30 giugno) usata da one_to_one_season, non una seconda regola parallela.
 *
 * Valori "reali" (calibrati sullo storico, invariati dalla v2): credito
 * lezione/bim=32€, credito call/bim=22€. Il canone (Asse A) è ora dato
 * dalla formula, non da stime per scaglione — 4=52€ è uno scostamento
 * consapevole di −2€/mese dal reale storico (54€), vedi nota v3 §2.
 * Nessuna tabella DB configurabile dal gestionale per ora (i valori sono
 * ancora in discussione — decisione aperta #3 del doc, tag sconto
 * coach-assegnato — quindi TS costanti in un solo file, facili da trovare
 * e correggere, restano la scelta più onesta finché non si stabilizzano).
 */
import { seasonEnd } from "./pricing";

export const WORKOUT_FREQUENCIES = [3, 4, 5, 6, 7] as const;
export type WorkoutFrequency = (typeof WORKOUT_FREQUENCIES)[number];

/** Canone/mese per allenamenti/settimana. Floor 3: valori < 3 non esistono.
 *  Formula: A(3)=44€, delta −1€ a ogni scaglione (8,7,6,5,4… da k=4 a k=n). */
export const WORKOUT_FREQUENCY_PRICE_CENTS: Record<WorkoutFrequency, number> = {
  3: 4400,
  4: 5200,
  5: 5900,
  6: 6500,
  7: 7000,
};

export const CHECKIN_CADENCES = [
  "bimestrale",
  "mensile",
  "due_al_mese",
  "settimanale",
] as const;
export type CheckinCadence = (typeof CHECKIN_CADENCES)[number];

export const CHECKIN_CADENCE_LABEL: Record<CheckinCadence, string> = {
  bimestrale: "1 volta ogni 2 mesi",
  mensile: "1 volta al mese",
  due_al_mese: "2 volte al mese",
  settimanale: "1 volta a settimana",
};

export const CHECKIN_CHANNELS = ["presenza", "remoto"] as const;
export type CheckinChannel = (typeof CHECKIN_CHANNELS)[number];

export const CHECKIN_CHANNEL_LABEL: Record<CheckinChannel, string> = {
  presenza: "In presenza (vasca)",
  remoto: "Remoto (call)",
};

/** Credito check-in, €/mese-equivalente, per cadenza × canale.
 *  bimestrale/mensile/bisettimanale (due_al_mese) invariate dalla v2;
 *  settimanale ricalcolata su 4 lezioni/mese fisse (v3, era 108/75€). */
export const CHECKIN_CREDIT_PRICE_CENTS: Record<
  CheckinCadence,
  Record<CheckinChannel, number>
> = {
  bimestrale: { presenza: 1600, remoto: 1100 }, // remoto = reale (storico)
  mensile: { presenza: 3200, remoto: 2200 },
  due_al_mese: { presenza: 6000, remoto: 4100 },
  settimanale: { presenza: 11300, remoto: 7700 },
};

export type EliteSelection = {
  allenamenti: WorkoutFrequency;
  cadenza: CheckinCadence;
  canale: CheckinChannel;
};

/** Prezzo mensile-equivalente (canone + credito check-in), in centesimi. */
export function eliteMonthlyPriceCents(sel: EliteSelection): number {
  return (
    WORKOUT_FREQUENCY_PRICE_CENTS[sel.allenamenti] +
    CHECKIN_CREDIT_PRICE_CENTS[sel.cadenza][sel.canale]
  );
}

/** "A partire da" — combinazione più economica disponibile (3 all. + call/bimestre). */
export const ELITE_ENTRY_PRICE_CENTS = eliteMonthlyPriceCents({
  allenamenti: 3,
  cadenza: "bimestrale",
  canale: "remoto",
});

/** Periodo di fatturazione: mensile o bimestrale (importo raddoppiato, stesso mensile-equivalente). */
export const BILLING_PERIODS = ["mensile", "bimestrale"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export function eliteTotalPriceCents(
  sel: EliteSelection,
  periodo: BillingPeriod,
): number {
  const monthly = eliteMonthlyPriceCents(sel);
  return periodo === "bimestrale" ? monthly * 2 : monthly;
}

/**
 * Doc v3 (30/08) — il rinnovo/incasso segue 1:1 la cadenza di check-in
 * scelta, niente domanda separata: bimestre paga bimestrale, mensile/
 * bisettimanale/settimanale pagano mensile. Un'eccezione manuale (cliente
 * bimestre che spalma su base mensile) è un tag coach, non un'opzione qui.
 */
export function billingPeriodForCadence(cadenza: CheckinCadence): BillingPeriod {
  return cadenza === "bimestrale" ? "bimestrale" : "mensile";
}

/** Descrizione leggibile della configurazione, per email/notifica/gestionale. */
export function eliteSelectionLabel(
  sel: EliteSelection,
  periodo: BillingPeriod,
): string {
  return `${sel.allenamenti} allenamenti/sett + check-in ${CHECKIN_CADENCE_LABEL[sel.cadenza].toLowerCase()} (${CHECKIN_CHANNEL_LABEL[sel.canale].toLowerCase()}), fatturazione ${periodo}`;
}

/**
 * TASK 7 (feedback 29/08), sconto aggiornato a 15% dal doc v3 (30/08) —
 * chi prepaga l'intera stagione subito dopo il questionario, invece di
 * pagare mese per mese. "Stagione" è la stessa convenzione di
 * `one_to_one_season` (payment/pricing.ts): fino al 30 giugno più vicino,
 * mai indietro.
 */
export const SEASON_PREPAY_DISCOUNT = 0.15;

/**
 * Mesi dal mese di `from` (incluso) al mese di fine stagione (incluso).
 * Es. 29 agosto → stagione fino a giugno prossimo = 11 mesi (ago…giu).
 * Nessun calcolo sul giorno del mese: chi si iscrive oggi paga il mese
 * corrente per intero, come le altre attivazioni manuali del progetto.
 */
export function monthsToSeasonEnd(from: Date = new Date()): number {
  const end = seasonEnd(from);
  return (
    (end.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - from.getUTCMonth()) +
    1
  );
}

export type EliteSeasonQuote = {
  months: number;
  monthlyCents: number;
  fullCents: number;
  discountedCents: number;
};

/** Preventivo stagione intera prepagata (canone mensile-equivalente × mesi, -15%). */
export function eliteSeasonQuote(
  sel: EliteSelection,
  from: Date = new Date(),
): EliteSeasonQuote {
  const monthlyCents = eliteMonthlyPriceCents(sel);
  const months = monthsToSeasonEnd(from);
  const fullCents = monthlyCents * months;
  const discountedCents = Math.round(fullCents * (1 - SEASON_PREPAY_DISCOUNT));
  return { months, monthlyCents, fullCents, discountedCents };
}

/** Descrizione leggibile per il prepagamento stagione, per email/gestionale. */
export function eliteSeasonLabel(sel: EliteSelection, months: number): string {
  return `${sel.allenamenti} allenamenti/sett + check-in ${CHECKIN_CADENCE_LABEL[sel.cadenza].toLowerCase()} (${CHECKIN_CHANNEL_LABEL[sel.canale].toLowerCase()}) — stagione intera prepagata (${months} mesi, -15%)`;
}
