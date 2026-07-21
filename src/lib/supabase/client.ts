import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase per il BROWSER.
 * Usa la chiave anon (pubblica): la sicurezza dei dati passa dalla RLS.
 *
 * Onda 14.3: NON importa `@/lib/env` (schema zod) → così zod resta fuori dal
 * bundle client. Le `NEXT_PUBLIC_*` sono inlined a build-time; qui basta la
 * stessa normalizzazione tollerante dell'URL (dashboard → endpoint API).
 */
function normalizeUrl(raw: string): string {
  const u = raw.trim().replace(/\/+$/, "");
  const dash = u.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  return dash ? `https://${dash[1]}.supabase.co` : u;
}

export function createClient() {
  return createBrowserClient(
    normalizeUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
