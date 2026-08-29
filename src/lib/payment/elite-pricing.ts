/**
 * Prezzario 1:1 Elite — GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md (28/08/2026).
 * Due assi indipendenti, sommati per il prezzo mensile-equivalente:
 *
 *  - Asse A — canone allenamenti/settimana (programmazione scritta),
 *    floor a 3 (chi chiede meno paga comunque 3).
 *  - Asse B — credito check-in, due binari per canale (in presenza / remoto),
 *    cadenza scelta dall'atleta (bimestre/mese/2 al mese/settimana).
 *
 * Videoanalisi resta prodotto standalone (100€), non entra qui.
 *
 * Valori "reali" (calibrati sullo storico): canone(4)=54€, credito call/bim=22€.
 * Gli altri sono stime esplicitamente dichiarate tali nella nota sorgente —
 * usati così come dati, in attesa di conferma/correzione di Alessio (decisione
 * aperta #1 della nota: l'ancora 32€/lezione-bim). Nessuna tabella DB
 * configurabile dal gestionale per ora (la nota lo suggerisce come
 * architettura finale, "no hardcode" — qui i valori sono ancora in
 * discussione, quindi TS costanti in un solo file, facili da trovare e
 * correggere, sono la scelta più onesta finché non si stabilizzano).
 */

export const WORKOUT_FREQUENCIES = [3, 4, 5, 6] as const;
export type WorkoutFrequency = (typeof WORKOUT_FREQUENCIES)[number];

/** Canone/mese per allenamenti/settimana. Floor 3: valori < 3 non esistono. */
export const WORKOUT_FREQUENCY_PRICE_CENTS: Record<WorkoutFrequency, number> = {
  3: 4200, // stima
  4: 5400, // reale (storico)
  5: 6400, // stima
  6: 7300, // stima
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

/** Credito check-in, €/mese-equivalente, per cadenza × canale. */
export const CHECKIN_CREDIT_PRICE_CENTS: Record<
  CheckinCadence,
  Record<CheckinChannel, number>
> = {
  bimestrale: { presenza: 1600, remoto: 1100 }, // remoto = reale (storico)
  mensile: { presenza: 3200, remoto: 2200 },
  due_al_mese: { presenza: 6000, remoto: 4100 },
  settimanale: { presenza: 10800, remoto: 7500 },
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

/** Descrizione leggibile della configurazione, per email/notifica/gestionale. */
export function eliteSelectionLabel(
  sel: EliteSelection,
  periodo: BillingPeriod,
): string {
  return `${sel.allenamenti} allenamenti/sett + check-in ${CHECKIN_CADENCE_LABEL[sel.cadenza].toLowerCase()} (${CHECKIN_CHANNEL_LABEL[sel.canale].toLowerCase()}), fatturazione ${periodo}`;
}
