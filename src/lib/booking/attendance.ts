// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

/**
 * Quando si può segnare Presente/Assente su una prenotazione.
 *
 * Nasce da un caso vero: il 13/09 una lezione del 19/09 è stata confermata e,
 * seicento millisecondi dopo, chiusa come "fatta". Nella scheda del coach il
 * tasto «Presente» compare nello stesso identico punto dove stava «Conferma
 * lezione»: un secondo clic e la seduta futura risultava svolta. Per il
 * nuotatore spariva dalle prossime lezioni, quindi la riprenotava — e il
 * secondo token se ne andava.
 *
 * La regola sta qui, in un posto solo, perché la usano sia la server action
 * (dove è vincolante) sia la UI dell'agenda (dove evita il clic di troppo).
 */
export type AttendanceCheck = {
  status: string | null | undefined;
  starts_at: string | null | undefined;
};

/**
 * true se la presenza si può segnare ora: lezione confermata e già cominciata.
 * Una lezione ancora da fare non si chiude, nemmeno per sbaglio.
 */
export function canMarkAttendance(
  b: AttendanceCheck,
  now: number = Date.now(),
): boolean {
  if (b.status !== "confirmed") return false;
  if (!b.starts_at) return false;
  const start = new Date(b.starts_at).getTime();
  if (Number.isNaN(start)) return false;
  return start <= now;
}
