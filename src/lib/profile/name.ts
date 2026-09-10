// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

/**
 * Normalizzazione nome/cognome — "prima lettera di ogni parola maiuscola,
 * resto minuscolo", separatori: spazio, apostrofo, trattino (gestisce
 * "d'angelo" → "D'Angelo", "anna-maria" → "Anna-Maria", "di maria" →
 * "Di Maria"). Comprime spazi multipli, trim. Usata sia lato swimmer
 * (banner "completa il profilo") sia lato coach (scheda nuotatore),
 * stessa funzione per non divergere.
 */
export function titleCaseName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("it-IT")
    .replace(
      /(^|[\s'-])(\p{L})/gu,
      (_, sep: string, ch: string) => sep + ch.toLocaleUpperCase("it-IT"),
    );
}
