"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, type Profile } from "@/lib/auth";
import { logEvent } from "@/lib/ledger";
import { notifyUser } from "@/lib/notify";
import { romeWallToUtc } from "@/lib/booking/slots";
import { buildRunsheet, type Participant } from "@/lib/events/runsheet";

export type VAState = { error?: string; info?: string };

async function coachOnly(): Promise<Profile | null> {
  const p = await getCurrentProfile();
  return p && p.role === "coach" ? p : null;
}

function localToUtc(s: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(s);
  if (!m) return null;
  return romeWallToUtc(m[1], Number(m[2]) * 60 + Number(m[3])).toISOString();
}

// ---------- Creazione evento videoanalisi ----------
export async function createVideoEvent(
  _prev: VAState,
  fd: FormData,
): Promise<VAState> {
  const c = await coachOnly();
  if (!c) return { error: "Non autorizzato." };

  const title = String(fd.get("title") ?? "").trim();
  const location = String(fd.get("location") ?? "").trim() || null;
  const ws = localToUtc(String(fd.get("window_start") ?? ""));
  const we = localToUtc(String(fd.get("window_end") ?? ""));
  if (!title) return { error: "Titolo obbligatorio." };
  if (!ws || !we || new Date(we) <= new Date(ws))
    return { error: "Finestra lavori non valida." };

  const lanes = Math.max(1, Number(fd.get("lanes") ?? 1));
  const setup = Number(fd.get("setup_min") ?? 5);
  const warmup = Number(fd.get("warmup_lead_min") ?? 30);
  const travelB = Number(fd.get("travel_before_min") ?? 0);
  const travelA = Number(fd.get("travel_after_min") ?? 0);
  const capacity = fd.get("capacity") ? Number(fd.get("capacity")) : null;
  const testIds = fd.getAll("tests").map(String).filter(Boolean);

  const supabase = await createClient();
  const { data: ev, error } = await supabase
    .from("events")
    .insert({
      coach_id: c.id,
      title,
      kind: "videoanalisi",
      format: "videoanalisi",
      location,
      mode: "pool",
      starts_at: ws,
      ends_at: we,
      window_start: ws,
      window_end: we,
      lanes,
      setup_min: setup,
      warmup_lead_min: warmup,
      travel_before_min: travelB,
      travel_after_min: travelA,
      capacity,
      blocks_calendar: true,
      runsheet_status: "draft",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  if (testIds.length) {
    await supabase
      .from("event_tests")
      .insert(testIds.map((test_id) => ({ event_id: ev!.id, test_id })));
  }
  revalidatePath("/coach/videoanalisi");
  return { info: "Evento videoanalisi creato." };
}

// ---------- Scaletta ----------
async function rebuild(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  opts: { order?: string[]; dropAbsent?: boolean } = {},
): Promise<string | null> {
  const { data: ev } = await supabase
    .from("events")
    .select("window_start, window_end, lanes, setup_min, warmup_lead_min")
    .eq("id", eventId)
    .single();
  if (!ev?.window_start || !ev?.window_end)
    return "Manca la finestra lavori dell'evento.";

  const { data: signups } = await supabase
    .from("event_signups")
    .select("id, created_at")
    .eq("event_id", eventId)
    .in("status", ["in", "attended"])
    .order("created_at");
  let list = (signups ?? []).map((s) => s.id);

  if (opts.dropAbsent) {
    const { data: absent } = await supabase
      .from("runsheet")
      .select("signup_id")
      .eq("event_id", eventId)
      .eq("status", "assente");
    const skip = new Set((absent ?? []).map((r) => r.signup_id));
    list = list.filter((id) => !skip.has(id));
  }
  if (opts.order?.length) {
    const inList = new Set(list);
    const ordered = opts.order.filter((id) => inList.has(id));
    const seen = new Set(ordered);
    list = [...ordered, ...list.filter((id) => !seen.has(id))];
  }

  const { data: sts } = list.length
    ? await supabase
        .from("signup_tests")
        .select("signup_id, tests(duration_min)")
        .in("signup_id", list)
    : { data: [] };
  const durBy: Record<string, number[]> = {};
  for (const r of sts ?? []) {
    const d = (r.tests as unknown as { duration_min?: number })?.duration_min ?? 0;
    (durBy[r.signup_id] ??= []).push(d);
  }

  const participants: Participant[] = list.map((id, i) => ({
    signupId: id,
    name: "",
    testDurations: durBy[id] ?? [],
    position: i + 1,
  }));
  const result = buildRunsheet(participants, {
    windowStart: new Date(ev.window_start),
    windowEnd: new Date(ev.window_end),
    lanes: ev.lanes,
    setupMin: ev.setup_min,
    warmupLeadMin: ev.warmup_lead_min,
  });

  await supabase.from("runsheet").delete().eq("event_id", eventId);
  const rows = result.rows.map((r) => ({
    event_id: eventId,
    signup_id: r.signupId,
    position: r.position,
    lane: r.lane,
    warmup_at: r.warmupAt.toISOString(),
    test_at: r.testAt.toISOString(),
    out_at: r.outAt.toISOString(),
    duration_min: r.durationMin,
  }));
  if (rows.length) await supabase.from("runsheet").insert(rows);
  return null;
}

export async function generateRunsheet(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const supabase = await createClient();
  await rebuild(supabase, String(fd.get("event_id") ?? ""));
  revalidatePath("/coach/videoanalisi", "layout");
}

export async function reorderRunsheet(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const supabase = await createClient();
  const order = String(fd.get("order") ?? "").split(",").filter(Boolean);
  await rebuild(supabase, String(fd.get("event_id") ?? ""), { order });
  revalidatePath("/coach/videoanalisi", "layout");
}

export async function recompactRunsheet(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const supabase = await createClient();
  await rebuild(supabase, String(fd.get("event_id") ?? ""), {
    dropAbsent: true,
  });
  revalidatePath("/coach/videoanalisi", "layout");
}

export async function publishRunsheet(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const eventId = String(fd.get("event_id") ?? "");
  const supabase = await createClient();
  await supabase
    .from("events")
    .update({ runsheet_status: "published" })
    .eq("id", eventId);

  const { data: rows } = await supabase
    .from("runsheet")
    .select("signup_id, event_signups(swimmer_id)")
    .eq("event_id", eventId);
  const { data: ev } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .single();
  for (const r of rows ?? []) {
    const sw = (r.event_signups as unknown as { swimmer_id?: string })
      ?.swimmer_id;
    if (sw)
      await notifyUser(
        sw,
        "booking",
        "Scaletta pubblicata",
        `${ev?.title ?? "Videoanalisi"}: trovi il tuo orario.`,
      );
  }
  revalidatePath("/coach/videoanalisi", "layout");
}

export async function setSignupStatus(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const supabase = await createClient();
  await supabase
    .from("event_signups")
    .update({ status: String(fd.get("status") ?? "in") })
    .eq("id", String(fd.get("id") ?? ""));
  revalidatePath("/coach/videoanalisi");
}

export async function setRunStatus(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const supabase = await createClient();
  await supabase
    .from("runsheet")
    .update({ status: String(fd.get("status") ?? "atteso") })
    .eq("id", String(fd.get("id") ?? ""));
  revalidatePath("/coach/videoanalisi", "layout");
}

// ---------- Chiusura → coda video (glide-ext-videoanalisi §5) ----------
export async function closeVideoEvent(fd: FormData): Promise<void> {
  const c = await coachOnly();
  if (!c) return;
  const eventId = String(fd.get("event_id") ?? "");
  const supabase = await createClient();

  const { data: ev } = await supabase
    .from("events")
    .select("title, starts_at")
    .eq("id", eventId)
    .single();
  const raceDate = ev?.starts_at
    ? new Date(ev.starts_at).toISOString().slice(0, 10)
    : null;

  const { data: done } = await supabase
    .from("runsheet")
    .select("signup_id, event_signups(swimmer_id)")
    .eq("event_id", eventId)
    .eq("status", "fatto");

  for (const r of done ?? []) {
    const sw = (r.event_signups as unknown as { swimmer_id?: string })
      ?.swimmer_id;
    if (!sw) continue;

    // codici test scelti da questo iscritto
    const { data: sts } = await supabase
      .from("signup_tests")
      .select("tests(code)")
      .eq("signup_id", r.signup_id);
    const codes = (sts ?? [])
      .map((x) => (x.tests as unknown as { code?: string })?.code)
      .filter(Boolean);

    const tag = `#${eventId}`;
    // dedup: se già in coda per questo evento, salta
    const { data: existing } = await supabase
      .from("race_videos")
      .select("id")
      .eq("swimmer_id", sw)
      .ilike("event", `%${tag}%`)
      .limit(1);
    if (existing && existing.length) continue;

    const { data: p } = await supabase
      .from("profiles")
      .select("service_type")
      .eq("id", sw)
      .single();
    const is11 =
      p?.service_type === "coaching_1_1" || p?.service_type === "both";

    await supabase.from("race_videos").insert({
      swimmer_id: sw,
      coach_id: c.id,
      event: `Videoanalisi · ${ev?.title ?? ""} — ${codes.join(", ")} · ${tag}`,
      race_date: raceDate,
      storage_path: null, // clip caricate dopo dal coach
      tier: is11 ? "coaching_1_1" : "open",
      status: is11 ? "pending" : "locked",
      paid: is11,
    });

    await logEvent(supabase, sw, "videoanalisi.done", {
      event_id: eventId,
      test_codes: codes,
    });
  }
  revalidatePath("/coach/videoanalisi", "layout");
  revalidatePath("/coach/video");
}
