/**
 * ADR-014 — parametri del gate ad accesso a degrado progressivo.
 * Cablati come config (stesso pattern di BOOKING in lib/booking/config.ts),
 * cambiabili da env senza toccare il codice.
 *
 * NIENTE "server-only" qui: PAYMENT_GATE è una costante pura, importata
 * anche da lib/access.ts e finita quindi in bundle client (es.
 * coach/libreria/library-form.tsx). Le coordinate di bonifico (che
 * SERVONO un client Supabase, quelle sì server-only) vivono a parte in
 * ./bank.ts — non qui, per non trascinarci dentro anche PAYMENT_GATE.
 */
export const PAYMENT_GATE = {
  /** Giorni di grazia dopo la scadenza: accesso invariato, solo banner + digest. */
  graceDays: Number(process.env.PAYMENT_GRACE_DAYS ?? 5),
} as const;
