import { z } from "zod";

/**
 * Variabili d'ambiente.
 *
 * - Supabase + app  → RICHIESTE (senza, non c'è auth/gating).
 * - Stripe, Resend  → OPZIONALI. Se mancano o sono placeholder, la
 *   relativa funzione resta "simulata" (vedi lib/flags.ts). Nessun crash.
 */

/** true se il valore esiste e non è un placeholder del template .env. */
export function configured(v: string | undefined | null): v is string {
  if (!v) return false;
  return !/INCOLLA_QUI|xxxxxxxxxxxx|price_\.\.\.|_\.\.\.$/.test(v.trim());
}

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  // Deve essere l'URL API del progetto (…supabase.co), NON l'URL della
  // dashboard. Un valore sbagliato fa ricevere HTML al posto di JSON e
  // rompe login/query: meglio bloccarlo subito con un messaggio chiaro.
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .refine((u) => /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(u.trim()), {
      message:
        "NEXT_PUBLIC_SUPABASE_URL deve essere l'URL API del progetto, es. https://xxxx.supabase.co — NON l'URL della dashboard (supabase.com/dashboard/...).",
    }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// Referenziate staticamente così Next le inlina nel bundle.
export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

/** Chiave pubblicabile Stripe (client). Undefined se non configurata. */
export const stripePublishableKey = configured(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
)
  ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
  : undefined;
