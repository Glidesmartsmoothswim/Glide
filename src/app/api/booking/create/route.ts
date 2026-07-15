import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { fullName } from "@/lib/types";
import { notifyCoaches } from "@/lib/notify";
import { logEvent } from "@/lib/ledger";
import {
  getCoachId,
  getServiceByCode,
  computeDaySlots,
} from "@/lib/booking/server";
import {
  getCreditStatus,
  consumeCredit,
  refundCredit,
  romeDateStr,
} from "@/lib/booking/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/booking/create  { service, startsAt, note? }
 * Ricontrolla lo slot, verifica credito/permessi, inserisce in modo atomico.
 * L'EXCLUDE constraint su bookings è la rete anti doppio-click: se il DB
 * rifiuta → 409. Stripe è parcheggiato: senza credito → modalità simulata
 * (payment='free', badge "simulato").
 */
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const code = String(body.service ?? "");
  const startsAtIso = String(body.startsAt ?? "");
  const note = String(body.note ?? "").trim().slice(0, 500) || null;
  if (!code || !startsAtIso)
    return Response.json({ error: "dati mancanti" }, { status: 400 });
  const startsAt = new Date(startsAtIso);
  if (Number.isNaN(startsAt.getTime()))
    return Response.json({ error: "data non valida" }, { status: 400 });

  const admin = createAdminClient();
  if (!admin)
    return Response.json({ error: "servizio non disponibile" }, { status: 503 });

  const service = await getServiceByCode(admin, code);
  if (!service) return Response.json({ error: "servizio ignoto" }, { status: 404 });

  const coachId = await getCoachId(admin);
  if (!coachId)
    return Response.json({ error: "coach non configurato" }, { status: 409 });

  const { data: p } = await admin
    .from("profiles")
    .select("service_type")
    .eq("id", profile.id)
    .single();
  const serviceType = p?.service_type ?? null;

  const credit = await getCreditStatus(admin, profile.id, serviceType);
  if (service.mode === "remote" && !credit.remoteAllowed)
    return Response.json(
      { error: "Le call non sono incluse nel tuo piano." },
      { status: 403 },
    );

  // Ri-valida lo slot: deve essere ancora tra quelli disponibili adesso.
  const dateStr = romeDateStr(startsAt);
  const slots = await computeDaySlots(admin, coachId, dateStr, service);
  if (!slots.some((d) => d.getTime() === startsAt.getTime()))
    return Response.json({ error: "Slot non più disponibile." }, { status: 409 });

  const endsAt = new Date(startsAt.getTime() + service.duration_min * 60_000);
  const blockUntil = new Date(endsAt.getTime() + service.buffer_min * 60_000);

  // Ordine di consumo: credito → altrimenti extra (simulato).
  let payment: "credit" | "free";
  let consumed = false;
  if (service.credit_cost > 0 && credit.remaining > 0) {
    consumed = await consumeCredit(admin, profile.id, credit.periodStart);
    if (consumed) payment = "credit";
    else if (credit.canBookExtra) payment = "free";
    else return Response.json({ error: "Credito esaurito." }, { status: 402 });
  } else if (credit.canBookExtra) {
    payment = "free"; // modalità simulata (Stripe da riconfigurare)
  } else {
    return Response.json({ error: "Nessun credito disponibile." }, { status: 402 });
  }

  const { data: booking, error } = await admin
    .from("bookings")
    .insert({
      coach_id: coachId,
      swimmer_id: profile.id,
      service_id: service.id,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      block_until: blockUntil.toISOString(),
      mode: service.mode,
      status: "confirmed",
      payment,
      swimmer_note: note,
    })
    .select("id")
    .single();

  if (error) {
    if (consumed) await refundCredit(admin, profile.id, credit.periodStart);
    const pgcode = (error as { code?: string }).code;
    if (pgcode === "23P01" || pgcode === "23505")
      return Response.json({ error: "Slot appena occupato." }, { status: 409 });
    return Response.json({ error: error.message }, { status: 500 });
  }

  await logEvent(admin, profile.id, "booking.created", {
    booking_id: booking!.id,
    service_code: service.code,
    mode: service.mode,
  });
  await notifyCoaches(
    "booking",
    "Nuova prenotazione",
    `${fullName(profile)} — ${service.name}`,
  );

  return Response.json({ ok: true, bookingId: booking!.id, payment });
}
