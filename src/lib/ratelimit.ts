import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting distribuito (S-3) su Upstash Redis — funziona anche su
 * serverless (Vercel), dove un limiter in-memory è per-istanza e inutile.
 *
 * NO-OP se le env non sono configurate: la prod non si rompe finché non imposti
 * UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (nessun NEXT_PUBLIC_).
 */
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

function make(limit: number, windowSec: number) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    prefix: "glide-rl",
    analytics: false,
  });
}

const limiters = {
  ai: make(20, 60), // endpoint AI: 20 richieste/min per utente
  auth: make(10, 60), // login/registrazione: 10 tentativi/min per identificativo
};

export type RlScope = keyof typeof limiters;

/** True se consentito. Se Upstash non è configurato → sempre true (no-op). */
export async function rateLimitOk(scope: RlScope, key: string): Promise<boolean> {
  const l = limiters[scope];
  if (!l) return true;
  try {
    const { success } = await l.limit(`${scope}:${key}`);
    return success;
  } catch {
    // Fail-open: un errore del limiter non deve bloccare l'app.
    return true;
  }
}
