// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

/**
 * MRR — mensile-equivalente per abbonato (12/09/2026).
 *
 * PRIMA: Business sommava un prezzo di LISTINO per `profiles.tier`
 * (`TIER_PRICE_CENTS.one_to_one_monthly`, 79€) per ogni 1:1 attivo. Due
 * errori in uno:
 *
 *  1. 79€ non è un prezzo del prezzario in vigore. Viene dai vecchi Price
 *     ID Stripe; la matrice di GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md v5 non
 *     lo contiene (entry 46€, 3 all. + check-in mensile in presenza 76€).
 *  2. `tier` non distingue mensile da stagionale. Un Pacchetto Stagionale
 *     Elite prepagato 646€ per 10 mesi vale 64,60€/mese, non 79€ — e due
 *     stagionali facevano 158€ di MRR al posto di 129,20€.
 *
 * ADESSO: il mensile-equivalente si RICAVA dal dato contabile che c'è già
 * su `profiles` — l'importo realmente incassato diviso i mesi che quel
 * pagamento copre (`paid_at` → `tier_expires_at`). Nessuna colonna nuova,
 * nessuna stima: un prepagamento stagionale si spalma sui suoi mesi, un
 * mensile resta il suo importo.
 *
 * Il listino resta solo come ULTIMA spiaggia, per un profilo attivato a
 * mano senza importo o senza date. In quel caso il numero è dichiarato
 * approssimato a chi guarda (`estimated`), invece di passare per esatto.
 */

import { TIER_PRICE_CENTS } from "./pricing";

/** Solo i campi contabili che servono: niente dipendenza dallo schema intero. */
export type MrrProfile = {
  tier: string;
  payment_amount_cents: number | null;
  paid_at: string | null;
  tier_expires_at: string | null;
};

/** Listino di fallback per i tier di ACCESSO (`profiles.tier`). */
const ACCESS_TIER_FALLBACK_CENTS: Record<string, number> = {
  open: TIER_PRICE_CENTS.open,
  open_plus: TIER_PRICE_CENTS.open_plus,
  one_to_one: TIER_PRICE_CENTS.one_to_one_monthly,
};

/** Giorni del mese medio gregoriano (365,25/12): niente deriva su 10 mesi. */
const DAYS_PER_MONTH = 365.25 / 12;
const MS_PER_MONTH = DAYS_PER_MONTH * 24 * 60 * 60 * 1000;

/**
 * Quanti mesi copre un pagamento, dal giorno d'incasso alla scadenza.
 * Arrotondato all'intero più vicino (con floor a 1): le date reali sono
 * negoziate a mano e cadono su giorni di calendario, non su multipli
 * esatti di mese — 03/09→30/06 sono 9,86 mesi e vanno letti come 10.
 * `null` se le date mancano o non sono leggibili.
 */
export function monthsCovered(
  paidAt: string | null,
  expiresAt: string | null,
): number | null {
  if (!paidAt || !expiresAt) return null;
  const from = new Date(paidAt).getTime();
  const to = new Date(expiresAt).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  if (to <= from) return null;
  return Math.max(1, Math.round((to - from) / MS_PER_MONTH));
}

export type MonthlyEquivalent = {
  /** Mensile-equivalente in centesimi. 0 per un omaggio. */
  cents: number;
  /** true = ricavato dal listino, non dall'incasso reale. Va detto. */
  estimated: boolean;
  /** Mesi coperti dall'incasso, se ricostruibili. */
  months: number | null;
};

/**
 * Un abbonamento OMAGGIO è `payment_amount_cents = 0`: il servizio lo
 * riceve davvero (conta fra gli attivi) ma non genera ricavo ricorrente.
 * Distinto da `null`, che significa "importo non registrato".
 */
export const isGifted = (p: Pick<MrrProfile, "payment_amount_cents">): boolean =>
  p.payment_amount_cents === 0;

/** Mensile-equivalente di un singolo abbonato attivo. */
export function monthlyEquivalent(p: MrrProfile): MonthlyEquivalent {
  if (isGifted(p)) return { cents: 0, estimated: false, months: null };

  const amount = p.payment_amount_cents;
  const months = monthsCovered(p.paid_at, p.tier_expires_at);

  // Il caso normale: importo incassato + finestra coperta, entrambi noti.
  if (amount != null && amount > 0 && months != null)
    return { cents: Math.round(amount / months), estimated: false, months };

  // Importo noto ma date incomplete: l'importo è comunque un dato reale,
  // meglio di un prezzo di listino. Resta approssimato perché non si sa
  // su quanti mesi spalmarlo — si assume un mese.
  if (amount != null && amount > 0)
    return { cents: amount, estimated: true, months: null };

  // Nessun dato contabile: listino, dichiarato come stima.
  return {
    cents: ACCESS_TIER_FALLBACK_CENTS[p.tier] ?? 0,
    estimated: true,
    months: null,
  };
}

export type MrrBreakdown = {
  /** MRR totale in centesimi. */
  cents: number;
  /** Abbonati che contribuiscono (omaggi esclusi). */
  paying: number;
  /** Abbonati omaggio: attivi, ma fuori dall'MRR. */
  gifted: number;
  /** Quanti contributi vengono dal listino invece che dall'incasso reale. */
  estimated: number;
};

/** MRR dell'insieme di abbonati ATTIVI (il gate lo decide il chiamante). */
export function mrrOf(profiles: readonly MrrProfile[]): MrrBreakdown {
  return profiles.reduce<MrrBreakdown>(
    (acc, p) => {
      if (isGifted(p)) return { ...acc, gifted: acc.gifted + 1 };
      const m = monthlyEquivalent(p);
      return {
        cents: acc.cents + m.cents,
        paying: acc.paying + 1,
        gifted: acc.gifted,
        estimated: acc.estimated + (m.estimated ? 1 : 0),
      };
    },
    { cents: 0, paying: 0, gifted: 0, estimated: 0 },
  );
}
