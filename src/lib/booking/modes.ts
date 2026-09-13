// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

/**
 * Quali modalità di `services` si possono davvero prenotare (migration_061).
 *
 * `services` ospita due cose diverse da quando c'è la Colletta per la Birra:
 * servizi prenotabili e semplici voci di prezzo. Le query di prenotazione
 * filtravano solo su `active`, quindi una voce di listino attiva sarebbe
 * comparsa fra i servizi prenotabili — una "Colletta per la Birra · 3 €" da
 * mettere a calendario. Il filtro sta qui, in un posto solo, perché un
 * elenco ripetuto in tre file è un elenco che prima o poi diverge.
 */
export const BOOKABLE_MODES = ["pool", "remote", "group"] as const;
export type BookableMode = (typeof BOOKABLE_MODES)[number];

/** Voce di listino non prenotabile (es. la colletta): mai a calendario. */
export const LISTINO_MODE = "listino";

/** true se questa modalità si può mettere a calendario. */
export function isBookableMode(mode: string | null | undefined): boolean {
  return (BOOKABLE_MODES as readonly string[]).includes(mode ?? "");
}

/** Tiene solo i servizi prenotabili. Da usare dopo ogni lettura di `services`. */
export function onlyBookable<T extends { mode: string }>(services: T[]): T[] {
  return services.filter((s) => isBookableMode(s.mode));
}
