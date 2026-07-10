import { z } from "zod";

/**
 * Validazione centralizzata delle variabili d'ambiente.
 *
 * - `publicEnv`  → sicure nel browser (prefisso NEXT_PUBLIC_).
 * - `serverEnv`  → SEGRETE, solo lato server. Importare questo file
 *   in un componente client fa fallire il build: è voluto.
 *
 * In fase di Sprint 0 i valori possono essere ancora placeholder:
 * validiamo la *presenza e forma*, non la validità reale delle chiavi.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_OPEN: z.string().min(1),
  STRIPE_PRICE_OPEN_WATER: z.string().min(1),
  STRIPE_PRICE_ELITE: z.string().min(1),
  STRIPE_PRICE_BIRRA: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().email(),
});

// Le NEXT_PUBLIC_ vanno referenziate staticamente per essere inlined da Next.
export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
});

/**
 * Legge e valida i segreti server. Chiamare dentro codice che gira
 * SOLO sul server (route handler, server action, webhook).
 */
export function getServerEnv() {
  return serverSchema.parse(process.env);
}
