// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

/**
 * Parametri di prenotazione, cablati come config (glide-ext-booking §10).
 * Cambiabili da env senza toccare il codice.
 */
export const BOOKING = {
  /** Preavviso minimo: non si prenota a meno di N ore. */
  leadHours: Number(process.env.BOOKING_LEAD_HOURS ?? 12),
  /** Finestra di disdetta gratuita: entro N ore prima si perde il credito. */
  cancelHours: Number(process.env.BOOKING_CANCEL_HOURS ?? 24),
  /** Orizzonte di prenotazione mostrato al nuotatore. */
  horizonDays: 14,
} as const;

export const TZ = "Europe/Rome";
