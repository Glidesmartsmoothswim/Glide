import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { logEvent } from "@/lib/ledger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/events/signup { eventId }
 * Iscrizione a un evento con controllo capienza → waitlist se pieno.
 * Service-role (ADR-008): la capienza si valida lato server, non dal client.
 */
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const eventId = String(body.eventId ?? "");
  const testIds: string[] = Array.isArray(body.tests)
    ? body.tests.map(String)
    : [];
  if (!eventId) return Response.json({ error: "id mancante" }, { status: 400 });

  const admin = createAdminClient();
  if (!admin)
    return Response.json({ error: "servizio non disponibile" }, { status: 503 });

  const { data: ev } = await admin
    .from("events")
    .select("id, kind, capacity, audience, status")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev || ev.status !== "published")
    return Response.json({ error: "evento non disponibile" }, { status: 404 });

  const { data: p } = await admin
    .from("profiles")
    .select("service_type")
    .eq("id", profile.id)
    .single();
  const tier = p?.service_type ?? null;
  if (ev.audience && tier && !ev.audience.includes(tier))
    return Response.json({ error: "Evento non nel tuo piano." }, { status: 403 });

  let status = "in";
  if (ev.capacity != null) {
    const { count } = await admin
      .from("event_signups")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .in("status", ["in", "attended"]);
    if ((count ?? 0) >= ev.capacity) status = "waitlist";
  }

  const { data: signup, error } = await admin
    .from("event_signups")
    .upsert(
      { event_id: eventId, swimmer_id: profile.id, status },
      { onConflict: "event_id,swimmer_id" },
    )
    .select("id")
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Videoanalisi: registra i test scelti (sostituisce la selezione precedente).
  if (signup && testIds.length >= 0) {
    await admin.from("signup_tests").delete().eq("signup_id", signup.id);
    if (testIds.length)
      await admin
        .from("signup_tests")
        .insert(testIds.map((test_id) => ({ signup_id: signup.id, test_id })));
  }

  await logEvent(admin, profile.id, "event.signup", {
    event_id: eventId,
    kind: ev.kind,
  });

  return Response.json({ ok: true, status });
}
