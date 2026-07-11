import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, configured } from "@/lib/env";

/**
 * Client Supabase con la service_role key: BYPASSA la RLS.
 * Usare SOLO lato server per operazioni amministrative legittime
 * (es. creare l'utente auth di un nuovo nuotatore). Mai nel browser.
 * Ritorna null se la chiave non è configurata.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!configured(key)) return null;
  return createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, key!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
