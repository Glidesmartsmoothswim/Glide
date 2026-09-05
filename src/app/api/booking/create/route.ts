import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";
import { fullName } from "@/lib/types";
import { notifyCoaches, notifyCoachesEmail, notifyUser } from "@/lib/notify";
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
import { effectiveCashPriceCents } from "@/lib/booking/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/booking/create  { service, startsAt, note?, method? }
 * Ricontrolla lo slot, verifica credito/permessi, inserisce in modo atomico.
 * L'EXCLUDE constraint su bookings è la rete anti doppio-click: se il DB
 * rifiuta → 409.
 * Saldo (ADR-010): credito se disponibile; altrimenti il nuotatore sceglie
 * il metodo — `cash` = saldo diretto col coach, booking `da_incassare` con
 * l'importo dal listino. Lo stato di cassa lo scrive SOLO il server.
 */
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("unauthorized", { status: 401 });

  // ADR-016 — gate ad accesso: `overdue` blocca SOLO le nuove prenotazioni a
  // valere sull'abbonamento, mai lo storico/readiness (che non passano da
  // qui). Un free/Base (ADR-015) non è toccato: il gate torna
  // `not_applicable`, e prenotare è una funzione Base.
  //
  // `due` NON blocca qui, a differenza di `overdue`: chi ha una richiesta di
  // attivazione in corso deve poter comunque prenotare la singola lezione,
  // che è funzione Base e si salda a parte (GATE_ACCESS: `due` → ridotto a
  // Base, e prenotazioni ed eventi SONO Base).
  if (profile.payment_gate === "overdue")
    return Response.json(
      {
        error:
          "Il tuo piano è scaduto da troppi giorni: rinnova per prenotare una nuova lezione.",
      },
      { status: 402 },
    );

  const body = await req.json().catch(() => ({}));
  const code = String(body.service ?? "");
  const startsAtIso = String(body.startsAt ?? "");
  const method = body.method === "cash" ? "cash" : null;
  const useToken = body.useToken === true;
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
    .select("service_type, group_lesson_affiliate, extra_lesson_price_override_cents")
    .eq("id", profile.id)
    .single();
  const serviceType = p?.service_type ?? null;
  // Prezzo cash effettivo per QUESTO nuotatore (Sprint C.3): sconto
  // affiliato su lezione di gruppo, o override storico su lezione extra.
  const cashPriceCents = effectiveCashPriceCents(service, p ?? {});

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

  // Ordine di consumo: token 1:1 (se richiesto) → credito → metodo scelto.
  let payment: "credit" | "pending" | "token";
  let paymentMethod: "credit" | "cash" | "token";
  let consumed = false;
  let tokenId: string | null = null;

  if (useToken) {
    // Reserve atomico di un token valido (Onda 13.6). Il tipo è derivato dal
    // servizio prenotato (mai dal client): un token group_lesson non copre
    // una lezione privata e viceversa (ADR-015, Sprint C.1).
    const tokenType = service.code.startsWith("group_")
      ? "group_lesson"
      : "private_lesson";
    const { data: tid } = await admin.rpc("reserve_lesson_token", {
      p_swimmer: profile.id,
      p_type: tokenType,
    });
    if (!tid)
      return Response.json(
        { error: "Nessun token disponibile." },
        { status: 402 },
      );
    tokenId = tid as string;
    payment = "token";
    paymentMethod = "token";
  } else if (service.credit_cost > 0 && credit.remaining > 0) {
    consumed = await consumeCredit(admin, profile.id, credit.periodStart);
    if (consumed) {
      payment = "credit";
      paymentMethod = "credit";
    } else if (credit.canBookExtra && method === "cash") {
      payment = "pending";
      paymentMethod = "cash";
    } else {
      return Response.json({ error: "Credito esaurito." }, { status: 402 });
    }
  } else if (credit.canBookExtra && method === "cash") {
    payment = "pending";
    paymentMethod = "cash";
  } else if (credit.canBookExtra) {
    // Nessun credito e nessun metodo indicato: la UI deve proporre la scelta.
    return Response.json(
      { error: "Scegli come saldare la lezione.", needsMethod: true },
      { status: 402 },
    );
  } else {
    return Response.json({ error: "Nessun credito disponibile." }, { status: 402 });
  }

  const isCash = paymentMethod === "cash";
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
      status: "pending",
      payment,
      payment_method: paymentMethod,
      payment_status: isCash ? "da_incassare" : null,
      amount_cents: isCash ? cashPriceCents : null,
      swimmer_note: note,
    })
    .select("id")
    .single();

  if (error) {
    if (consumed) await refundCredit(admin, profile.id, credit.periodStart);
    if (tokenId) await admin.rpc("release_lesson_token", { p_token: tokenId });
    const pgcode = (error as { code?: string }).code;
    if (pgcode === "23P01" || pgcode === "23505")
      return Response.json({ error: "Slot appena occupato." }, { status: 409 });
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Token 1:1: lega il token riservato alla prenotazione andata a buon fine.
  if (tokenId)
    await admin.rpc("link_lesson_token", {
      p_token: tokenId,
      p_booking: booking!.id,
    });

  await logEvent(admin, profile.id, "booking.created", {
    booking_id: booking!.id,
    service_code: service.code,
    mode: service.mode,
    payment_method: paymentMethod,
  });

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const swimmerName = fullName(profile);
  const whenLabel = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(startsAt);
  const cashNote = isCash
    ? ` · da incassare €${(cashPriceCents / 100).toFixed(0)}`
    : "";

  // TASK 4 (feedback 29/08): il coach oggi deve controllare a mano in
  // agenda — in-app (già esisteva) + email, stesso evento.
  await notifyCoaches(
    "booking",
    "Nuova richiesta di prenotazione",
    `${swimmerName} — ${service.name} · ${whenLabel}${cashNote}`,
  );
  await notifyCoachesEmail(
    `Nuova prenotazione — ${swimmerName}`,
    `<div style="font-family:Arial,sans-serif;color:#0B1220;line-height:1.5">
      <h2 style="color:#0E5EAB">Nuova richiesta di prenotazione</h2>
      <p><b>${esc(swimmerName)}</b> ha prenotato <b>${esc(service.name)}</b>.</p>
      <p><b>Quando:</b> ${whenLabel}</p>
      ${cashNote ? `<p><b>Da incassare:</b> €${(cashPriceCents / 100).toFixed(0)}</p>` : ""}
      ${note ? `<p><b>Nota del nuotatore:</b> ${esc(note)}</p>` : ""}
      <p style="color:#5b6b7b;font-size:13px">Conferma dall'agenda quando puoi.</p>
    </div>`,
  );
  // Conferma lato nuotatore (basso costo marginale, non il requisito core).
  await notifyUser(
    profile.id,
    "booking",
    "Prenotazione ricevuta",
    `${service.name} · ${whenLabel} — in attesa di conferma dal coach.`,
  );

  return Response.json({
    ok: true,
    bookingId: booking!.id,
    payment,
    paymentMethod,
    amountCents: isCash ? cashPriceCents : null,
  });
}
