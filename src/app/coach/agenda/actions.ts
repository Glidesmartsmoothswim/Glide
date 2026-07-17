"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, type Profile } from "@/lib/auth";
import { logEvent } from "@/lib/ledger";
import { romeWallToUtc } from "@/lib/booking/slots";

export type AgendaState = { error?: string; info?: string };

async function coachOnly(): Promise<Profile | null> {
  const p = await getCurrentProfile();
  return p && p.role === "coach" ? p : null;
}

/** "YYYY-MM-DDTHH:MM" (datetime-local, ora di Roma) → ISO UTC. */
function localToUtc(s: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(s);
  if (!m) return null;
  return romeWallToUtc(m[1], Number(m[2]) * 60 + Number(m[3])).toISOString();
}

// ---------- Disponibilità ----------
export async function addRule(
  _prev: AgendaState,
  fd: FormData,
): Promise<AgendaState> {
  const c = await coachOnly();
  if (!c) return { error: "Non autorizzato." };
  const weekday = Number(fd.get("weekday"));
  const start = String(fd.get("start_time") ?? "");
  const end = String(fd.get("end_time") ?? "");
  const step = Number(fd.get("slot_step") ?? 15);
  const modes = fd.getAll("modes").map(String).filter(Boolean);
  const label = String(fd.get("label") ?? "").trim() || null;
  if (!start || !end || end <= start)
    return { error: "La fine dev'essere dopo l'inizio." };
  if (modes.length === 0) return { error: "Scegli almeno una modalità." };

  const supabase = await createClient();
  const { error } = await supabase.from("availability_rules").insert({
    coach_id: c.id,
    weekday,
    start_time: start,
    end_time: end,
    slot_step: step,
    modes,
    label,
  });
  if (error) return { error: error.message };
  revalidatePath("/coach/agenda");
  return { info: "Finestra aggiunta." };
}

export async function deleteRule(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("availability_rules").delete().eq("id", id);
  revalidatePath("/coach/agenda");
}

export async function duplicateRuleAllWeek(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("availability_rules")
    .select("start_time,end_time,slot_step,modes,label")
    .eq("id", id)
    .maybeSingle();
  if (!r) return;
  const rows = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    coach_id: c.id,
    weekday,
    start_time: r.start_time,
    end_time: r.end_time,
    slot_step: r.slot_step,
    modes: r.modes,
    label: r.label,
  }));
  await supabase.from("availability_rules").insert(rows);
  revalidatePath("/coach/agenda");
}

export async function closeDay(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const day = String(fd.get("day") ?? "");
  if (!day) return;
  const supabase = await createClient();
  await supabase.from("availability_exceptions").insert({
    coach_id: c.id,
    day,
    kind: "closed",
    note: String(fd.get("note") ?? "").trim() || null,
  });
  revalidatePath("/coach/agenda");
}

export async function addExtra(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const day = String(fd.get("day") ?? "");
  const start = String(fd.get("start_time") ?? "");
  const end = String(fd.get("end_time") ?? "");
  if (!day || !start || !end || end <= start) return;
  const modes = fd.getAll("modes").map(String).filter(Boolean);
  const supabase = await createClient();
  await supabase.from("availability_exceptions").insert({
    coach_id: c.id,
    day,
    kind: "extra",
    start_time: start,
    end_time: end,
    modes: modes.length ? modes : ["pool", "remote"],
  });
  revalidatePath("/coach/agenda");
}

export async function deleteException(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const supabase = await createClient();
  await supabase
    .from("availability_exceptions")
    .delete()
    .eq("id", String(fd.get("id") ?? ""));
  revalidatePath("/coach/agenda");
}

// ---------- Prenotazioni ----------
async function setBookingStatus(
  id: string,
  status: "completed" | "no_show",
  coachNote: string | null,
) {
  const supabase = await createClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("id, swimmer_id, service_id, services(code)")
    .eq("id", id)
    .maybeSingle();
  if (!b) return;
  await supabase
    .from("bookings")
    .update({ status, coach_note: coachNote })
    .eq("id", id);
  const svc = b.services as unknown as { code?: string } | null;
  await logEvent(
    supabase,
    b.swimmer_id,
    status === "completed" ? "booking.completed" : "booking.no_show",
    { booking_id: id, service_code: svc?.code ?? null },
  );
  revalidatePath("/coach/agenda");
}

export async function completeBooking(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  await setBookingStatus(
    String(fd.get("id") ?? ""),
    "completed",
    String(fd.get("coach_note") ?? "").trim() || null,
  );
}

export async function noShowBooking(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  await setBookingStatus(String(fd.get("id") ?? ""), "no_show", null);
}

/**
 * Registro di cassa (ADR-010): da_incassare → incassato. SOLO il coach
 * (la RLS su bookings nega ogni update al nuotatore). Ledger:
 * payment.collected — mai usato per derivare gamification (ADR-005).
 */
export async function markCollected(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const id = String(fd.get("id") ?? "");
  const receipt = String(fd.get("receipt_number") ?? "").trim() || null;
  if (!id) return;

  const supabase = await createClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("id, swimmer_id, amount_cents, payment_method, payment_status")
    .eq("id", id)
    .maybeSingle();
  if (!b || b.payment_method !== "cash" || b.payment_status !== "da_incassare")
    return;

  await supabase
    .from("bookings")
    .update({
      payment_status: "incassato",
      paid_at: new Date().toISOString(),
      receipt_number: receipt,
      payment: "paid",
    })
    .eq("id", id);

  await logEvent(supabase, b.swimmer_id, "payment.collected", {
    booking_id: b.id,
    amount_cents: b.amount_cents,
    method: "cash",
  });
  revalidatePath("/coach/agenda");
}

// ---------- Eventi ----------
export async function createEvent(
  _prev: AgendaState,
  fd: FormData,
): Promise<AgendaState> {
  const c = await coachOnly();
  if (!c) return { error: "Non autorizzato." };
  const title = String(fd.get("title") ?? "").trim();
  const kind = String(fd.get("kind") ?? "").trim();
  const start = String(fd.get("starts_at") ?? "");
  const end = String(fd.get("ends_at") ?? "");
  if (!title || !kind) return { error: "Titolo e tipo obbligatori." };
  const startUtc = localToUtc(start);
  const endUtc = localToUtc(end);
  if (!startUtc || !endUtc || new Date(endUtc) <= new Date(startUtc))
    return { error: "Le date non sono valide." };

  const supabase = await createClient();
  const { error } = await supabase.from("events").insert({
    coach_id: c.id,
    title,
    kind,
    description: String(fd.get("description") ?? "").trim() || null,
    starts_at: startUtc,
    ends_at: endUtc,
    location: String(fd.get("location") ?? "").trim() || null,
    mode: String(fd.get("mode") ?? "pool"),
    capacity: fd.get("capacity") ? Number(fd.get("capacity")) : null,
    blocks_calendar: fd.get("blocks_calendar") === "on",
  });
  if (error) return { error: error.message };
  revalidatePath("/coach/agenda");
  return { info: "Evento pubblicato." };
}

export async function cancelEvent(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const supabase = await createClient();
  await supabase
    .from("events")
    .update({ status: "cancelled" })
    .eq("id", String(fd.get("id") ?? ""));
  revalidatePath("/coach/agenda");
}
