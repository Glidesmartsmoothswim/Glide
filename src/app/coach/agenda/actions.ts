"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile, type Profile } from "@/lib/auth";
import { logEvent } from "@/lib/ledger";
import { notifyUser } from "@/lib/notify";
import { romeWallToUtc } from "@/lib/booking/slots";
import {
  romeDateStr,
  getEntitlement,
  periodBounds,
  refundCredit,
} from "@/lib/booking/credits";

/** Etichetta "sab 25 lug, 12:00" nel fuso di Roma. */
function whenLabel(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export type AgendaState = { error?: string; info?: string };

async function coachOnly(): Promise<Profile | null> {
  const p = await getCurrentProfile();
  return p && p.role === "coach" ? p : null;
}

/** Somma n giorni a una data 'YYYY-MM-DD' (aritmetica su date pura). */
function addDays(day: string, n: number): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Lunedì della settimana di 'YYYY-MM-DD'. */
function mondayOfStr(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunedì
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
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

/**
 * Duplica gli orari della settimana corrente sulla settimana successiva.
 * Le finestre RICORRENTI (availability_rules) si ripetono già ogni settimana:
 * qui si copiano le **aperture extra** per-data (availability_exceptions kind
 * 'extra') su giorno+7. Idempotente: salta quelle già presenti.
 */
export async function duplicateWeekToNext(
  _prev: AgendaState,
  _fd: FormData,
): Promise<AgendaState> {
  const c = await coachOnly();
  if (!c) return { error: "Non autorizzato." };
  const supabase = await createClient();

  const monday = mondayOfStr(romeDateStr());
  const sunday = addDays(monday, 6);

  const { data: exts } = await supabase
    .from("availability_exceptions")
    .select("day, start_time, end_time, modes, note")
    .eq("coach_id", c.id)
    .eq("kind", "extra")
    .gte("day", monday)
    .lte("day", sunday);
  if (!exts || exts.length === 0)
    return {
      info: "Nessuna apertura extra in questa settimana. Le finestre ricorrenti si ripetono già ogni settimana.",
    };

  const nextMon = addDays(monday, 7);
  const nextSun = addDays(sunday, 7);
  const { data: existing } = await supabase
    .from("availability_exceptions")
    .select("day, start_time, end_time")
    .eq("coach_id", c.id)
    .eq("kind", "extra")
    .gte("day", nextMon)
    .lte("day", nextSun);
  const has = new Set(
    (existing ?? []).map((e) => `${e.day}|${e.start_time}|${e.end_time}`),
  );

  const rows = exts
    .map((e) => ({
      coach_id: c.id,
      day: addDays(e.day as string, 7),
      kind: "extra",
      start_time: e.start_time,
      end_time: e.end_time,
      modes: e.modes,
      note: e.note,
    }))
    .filter((r) => !has.has(`${r.day}|${r.start_time}|${r.end_time}`));

  if (rows.length === 0)
    return { info: "La settimana successiva ha già questi orari." };

  const { error } = await supabase
    .from("availability_exceptions")
    .insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/coach/agenda");
  return {
    info: `Duplicati ${rows.length} orari sulla settimana successiva.`,
  };
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
 * Onda 24: il coach ACCETTA una richiesta di prenotazione (pending → confirmed).
 * Solo dopo la conferma compaiono Presente/Assente. Il nuotatore viene avvisato.
 */
export async function confirmBooking(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const id = String(fd.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("id, swimmer_id, starts_at, status, services(name)")
    .eq("id", id)
    .maybeSingle();
  if (!b || b.status !== "pending") return;

  await supabase.from("bookings").update({ status: "confirmed" }).eq("id", id);

  const svc = b.services as unknown as { name?: string } | null;
  await notifyUser(
    b.swimmer_id as string,
    "booking",
    "Lezione confermata",
    `${svc?.name ?? "Lezione"} · ${whenLabel(b.starts_at as string)}`,
  );
  await logEvent(supabase, b.swimmer_id as string, "booking.confirmed", {
    booking_id: id,
  });
  revalidatePath("/coach/agenda");
}

/**
 * Onda 24: il coach RIFIUTA una richiesta (pending → cancelled). Il nuotatore
 * non perde nulla: credito rimborsato o token liberato. Poi viene avvisato.
 */
export async function rejectBooking(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const id = String(fd.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { data: b } = await supabase
    .from("bookings")
    .select("id, swimmer_id, starts_at, status, payment, services(name)")
    .eq("id", id)
    .maybeSingle();
  if (!b || b.status !== "pending") return;

  const admin = createAdminClient();
  if (admin) {
    if (b.payment === "credit") {
      const { data: sp } = await admin
        .from("profiles")
        .select("service_type")
        .eq("id", b.swimmer_id)
        .single();
      const ent = await getEntitlement(admin, sp?.service_type ?? null);
      const { start } = periodBounds(
        ent?.period ?? "month",
        new Date(b.starts_at as string),
      );
      await refundCredit(admin, b.swimmer_id as string, start);
    } else if (b.payment === "token") {
      await admin
        .from("lesson_tokens")
        .update({ redeemed_at: null, redeemed_booking_id: null })
        .eq("redeemed_booking_id", id);
    }
  }

  await supabase
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id);

  const svc = b.services as unknown as { name?: string } | null;
  await notifyUser(
    b.swimmer_id as string,
    "booking",
    "Prenotazione non confermata",
    `${svc?.name ?? "Lezione"} · ${whenLabel(b.starts_at as string)} — riprova con un altro orario.`,
  );
  await logEvent(supabase, b.swimmer_id as string, "booking.rejected", {
    booking_id: id,
  });
  revalidatePath("/coach/agenda");
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
