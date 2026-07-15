import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { getCoachId, getServiceByCode, computeDaySlots } from "@/lib/booking/server";
import { getEntitlement } from "@/lib/booking/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/booking/slots?date=YYYY-MM-DD&service=<code>
 * Ricalcola gli slot LATO SERVER (mai fidarsi del client). Usa il client admin
 * per vedere TUTTE le prenotazioni del coach (la RLS mostrerebbe al nuotatore
 * solo le sue → griglia falsata).
 */
export async function GET(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("unauthorized", { status: 401 });

  const url = new URL(req.url);
  const dateStr = url.searchParams.get("date") ?? "";
  const code = url.searchParams.get("service") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !code)
    return Response.json({ error: "parametri mancanti" }, { status: 400 });

  const admin = createAdminClient();
  const db = admin ?? (await createClient());

  const service = await getServiceByCode(db, code);
  if (!service) return Response.json({ error: "servizio ignoto" }, { status: 404 });

  // Gating remoto: se il pacchetto non prevede le call, niente slot remoti.
  if (service.mode === "remote") {
    const { data: p } = await db
      .from("profiles")
      .select("service_type")
      .eq("id", profile.id)
      .single();
    const ent = await getEntitlement(db, p?.service_type ?? null);
    if (!ent?.remote_allowed) return Response.json({ slots: [] });
  }

  const coachId = await getCoachId(db);
  if (!coachId) return Response.json({ slots: [] });

  const slots = await computeDaySlots(db, coachId, dateStr, service);
  return Response.json({ slots: slots.map((d) => d.toISOString()) });
}
