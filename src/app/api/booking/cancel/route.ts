import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { fullName } from "@/lib/types";
import { notifyCoaches } from "@/lib/notify";
import { logEvent } from "@/lib/ledger";
import { BOOKING } from "@/lib/booking/config";
import { getEntitlement, periodBounds, refundCredit } from "@/lib/booking/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/booking/cancel { bookingId }
 * Oltre la finestra di disdetta (default 24h) e se pagata a credito → il
 * credito torna. Entro la finestra → si perde, con messaggio chiaro nella UI.
 */
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const bookingId = String(body.bookingId ?? "");
  if (!bookingId)
    return Response.json({ error: "id mancante" }, { status: 400 });

  const admin = createAdminClient();
  if (!admin)
    return Response.json({ error: "servizio non disponibile" }, { status: 503 });

  const { data: b } = await admin
    .from("bookings")
    .select("id, swimmer_id, starts_at, status, payment")
    .eq("id", bookingId)
    .maybeSingle();
  if (!b) return Response.json({ error: "prenotazione inesistente" }, { status: 404 });

  const isOwner = b.swimmer_id === profile.id;
  if (!isOwner && profile.role !== "coach")
    return new Response("forbidden", { status: 403 });
  if (b.status !== "confirmed")
    return Response.json({ error: "Prenotazione non attiva." }, { status: 409 });

  const hoursTo = (new Date(b.starts_at).getTime() - Date.now()) / 3_600_000;
  let refunded = false;
  if (hoursTo > BOOKING.cancelHours && b.payment === "credit") {
    const { data: sp } = await admin
      .from("profiles")
      .select("service_type")
      .eq("id", b.swimmer_id)
      .single();
    const ent = await getEntitlement(admin, sp?.service_type ?? null);
    const { start } = periodBounds(ent?.period ?? "month", new Date(b.starts_at));
    await refundCredit(admin, b.swimmer_id, start);
    refunded = true;
  }

  await admin
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", b.id);

  await logEvent(admin, b.swimmer_id, "booking.cancelled", {
    booking_id: b.id,
    refunded,
  });

  // Se ha disdetto il nuotatore, avvisa il coach che lo slot è libero.
  if (isOwner && profile.role !== "coach")
    await notifyCoaches(
      "booking",
      "Disdetta",
      `${fullName(profile)} ha liberato uno slot.`,
    );

  return Response.json({ ok: true, refunded });
}
