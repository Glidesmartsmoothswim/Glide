// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

/**
 * Guardia cron (S-4 · A-2bis). Le route chiamate dai cron di Vercel devono
 * rifiutare chiunque non sia il cron. Fail-CLOSED: se CRON_SECRET non è
 * configurato, si NEGA (più sicuro del no-op precedente). Vercel invia
 * automaticamente `Authorization: Bearer <CRON_SECRET>` quando la var è impostata.
 *
 * Funzione pura e testabile (nessun import "server-only": non espone il segreto,
 * lo confronta soltanto).
 */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
