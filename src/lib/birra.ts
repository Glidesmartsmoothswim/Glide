// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Colletta per la Birra — partita aperta, non pagamento online (migration_061).
 *
 * A 3 € la commissione di un incasso online è sproporzionata, e il coach non
 * vuole un canale di pagamento dedicato. Quindi: il servizio si eroga sempre,
 * l'importo si annota, si incassa col rinnovo successivo. Nessun paywall,
 * nessun video bloccato, nessuna integrazione con Stripe o PayPal.
 *
 * Vincolo di linguaggio (committente): il nuotatore non incontra un ostacolo.
 * Il video si carica e si lavora; i 3 € sono una colletta che si salda col
 * resto. Ogni testo che esce da qui deve suonare così.
 */

/** Stato di una partita. 'offerta' NON è 'pagata': vedi `chiudiBirra`. */
export type BirraState = "dovuta" | "pagata" | "offerta";

export type BirraTab = {
  id: string;
  swimmer_id: string;
  video_id: string | null;
  amount_cents: number;
  state: BirraState;
  opened_at: string;
  settled_at: string | null;
  transaction_id: string | null;
  note: string | null;
};

export const BIRRA_STATE_LABEL: Record<BirraState, string> = {
  dovuta: "Da incassare",
  pagata: "Incassata",
  offerta: "Offerta dal coach",
};

/**
 * Importo di riferimento della colletta, dal listino e non dal codice.
 *
 * Stava in `lib/video.ts` come `BIRRA_CENTS = 500` — un 5 € hardcoded che non
 * era più il prezzo giusto e che nessuno poteva cambiare senza un deploy. Ora
 * è la riga `birra` di `services` (migration_061), accanto agli altri prezzi.
 *
 * Il fallback a 300 esiste solo perché un prezzo mancante non deve far
 * fallire l'erogazione di un servizio da 3 €: si annota comunque, semmai si
 * corregge l'importo dopo. Se scatta, il listino non è configurato.
 */
export const BIRRA_FALLBACK_CENTS = 300;

export async function birraPriceCents(db: SupabaseClient): Promise<number> {
  const { data } = await db
    .from("services")
    .select("price_cents")
    .eq("code", "birra")
    .maybeSingle();
  const cents = data?.price_cents as number | undefined;
  return typeof cents === "number" && cents > 0 ? cents : BIRRA_FALLBACK_CENTS;
}

/** Le partite ancora aperte di un nuotatore, la più vecchia per prima. */
export async function birreAperte(
  db: SupabaseClient,
  swimmerId: string,
): Promise<BirraTab[]> {
  const { data } = await db
    .from("birra_tab")
    .select("*")
    .eq("swimmer_id", swimmerId)
    .eq("state", "dovuta")
    .order("opened_at", { ascending: true });
  return (data ?? []) as BirraTab[];
}

/** Totale dovuto da un nuotatore, in centesimi. 0 se non deve niente. */
export function totaleDovuto(tabs: BirraTab[]): number {
  return tabs.reduce((n, t) => n + (t.state === "dovuta" ? t.amount_cents : 0), 0);
}

/** "3 €" / "4,50 €" — mai "3.0". */
export function euro(cents: number): string {
  return `${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2).replace(".", ",")} €`;
}
