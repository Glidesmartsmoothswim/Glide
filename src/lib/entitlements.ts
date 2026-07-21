import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ServiceType } from "@/lib/types";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

/**
 * Onda 19 — diritti automatici legati al SERVIZIO (non al tier di accesso).
 *
 * Distinzione voluta (vedi migration_027): il "token lezione" mensile e
 * l'upload video incluso sono servizi DENTRO l'abbonamento 1:1. La videoanalisi
 * è invece un evento in agenda a pagamento, separato: non passa da qui.
 */

/** Ha il percorso 1:1 (dedicato o combinato con l'Open)? */
export function hasOneToOne(serviceType: ServiceType | null | undefined): boolean {
  return serviceType === "coaching_1_1" || serviceType === "both";
}

/** Modalità test attiva? Letta dalla config DB con la service_role. */
export async function isTestMode(): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { data } = await admin
    .from("app_config")
    .select("value")
    .eq("key", "test_mode")
    .maybeSingle();
  return data?.value === true;
}

/** Primo istante del mese corrente (UTC). */
function startOfMonthUTC(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
}

/**
 * Accredita 1 token "lezione inclusa" del mese al nuotatore 1:1 se non ne ha
 * già uno questo mese. Idempotente: pensato per l'assegnazione del servizio,
 * mentre il rinnovo periodico lo fa il cron grant_monthly_tokens().
 */
export async function grantMonthlyTokenIfMissing(
  admin: AdminClient,
  swimmerId: string,
): Promise<void> {
  const start = startOfMonthUTC();
  const { data: existing } = await admin
    .from("lesson_tokens")
    .select("id")
    .eq("swimmer_id", swimmerId)
    .eq("source", "mensile")
    .gte("granted_at", start.toISOString())
    .limit(1);
  if (existing && existing.length > 0) return;

  // Scadenza a fine mese corrente (ultimo secondo), coerente col cron.
  const endOfMonth = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1, 0, 0, 0) - 1000,
  );
  await admin.from("lesson_tokens").insert({
    swimmer_id: swimmerId,
    source: "mensile",
    expires_at: endOfMonth.toISOString(),
  });
}
