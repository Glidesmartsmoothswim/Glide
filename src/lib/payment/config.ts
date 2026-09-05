import { DEFAULT_GRACE_DAYS } from "./status";

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
 *
 * ADR-016 (05/09/2026) — il default scende da env a `DEFAULT_GRACE_DAYS`
 * (7, confermato da Alessio): un numero solo per tutto il progetto, così il
 * vecchio gate (./gate.ts) e quello derivato (./status.ts) non possono
 * rispondere due cose diverse nella finestra in cui convivono. La sorgente
 * definitiva sarà `app_config.payment_grace_days` — vedi
 * `paymentGraceDays()`: questo resta il valore di fallback.
 */
export const PAYMENT_GATE = {
  /** Giorni di grazia dopo la scadenza: accesso invariato, solo banner + digest. */
  graceDays: Number(process.env.PAYMENT_GRACE_DAYS ?? DEFAULT_GRACE_DAYS),
} as const;
