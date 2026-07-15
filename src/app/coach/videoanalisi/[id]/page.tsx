import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fullName } from "@/lib/types";
import { buildRunsheet, capacityLevel, type Participant } from "@/lib/events/runsheet";
import { VideoEventManager } from "@/components/videoanalisi/video-event-manager";

export const dynamic = "force-dynamic";

export default async function VideoEventDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole("coach");
  const supabase = await createClient();

  const { data: ev } = await supabase
    .from("events")
    .select(
      "id, title, location, window_start, window_end, lanes, setup_min, warmup_lead_min, capacity, runsheet_status, format",
    )
    .eq("id", id)
    .single();
  if (!ev || ev.format !== "videoanalisi") notFound();

  const { data: signups } = await supabase
    .from("event_signups")
    .select("id, swimmer_id, status, created_at")
    .eq("event_id", id)
    .order("created_at");
  const sigList = signups ?? [];

  const swIds = [...new Set(sigList.map((s) => s.swimmer_id))];
  const { data: profs } = swIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", swIds)
    : { data: [] };
  const nameById = Object.fromEntries(
    (profs ?? []).map((p) => [p.id, fullName(p)]),
  );

  const sigIds = sigList.map((s) => s.id);
  const { data: sts } = sigIds.length
    ? await supabase
        .from("signup_tests")
        .select("signup_id, tests(code, name, duration_min)")
        .in("signup_id", sigIds)
    : { data: [] };
  const testsBySignup: Record<
    string,
    { codes: string[]; durations: number[] }
  > = {};
  for (const r of sts ?? []) {
    const t = r.tests as unknown as {
      code?: string;
      duration_min?: number;
    } | null;
    const e = (testsBySignup[r.signup_id] ??= { codes: [], durations: [] });
    if (t?.code) e.codes.push(t.code);
    e.durations.push(t?.duration_min ?? 0);
  }

  // Semaforo: proietta la scaletta sugli iscritti accettati.
  const accepted = sigList.filter(
    (s) => s.status === "in" || s.status === "attended",
  );
  let overrun = 0;
  if (ev.window_start && ev.window_end) {
    const participants: Participant[] = accepted.map((s, i) => ({
      signupId: s.id,
      name: "",
      testDurations: testsBySignup[s.id]?.durations ?? [],
      position: i + 1,
    }));
    overrun = buildRunsheet(participants, {
      windowStart: new Date(ev.window_start),
      windowEnd: new Date(ev.window_end),
      lanes: ev.lanes,
      setupMin: ev.setup_min,
      warmupLeadMin: ev.warmup_lead_min,
    }).overrun;
  }

  const { data: run } = await supabase
    .from("runsheet")
    .select("id, signup_id, position, lane, warmup_at, test_at, out_at, status")
    .eq("event_id", id)
    .order("position");

  const signupsOut = sigList.map((s) => ({
    id: s.id,
    name: nameById[s.swimmer_id] ?? "Nuotatore",
    status: s.status,
    codes: testsBySignup[s.id]?.codes ?? [],
    packageMin: (testsBySignup[s.id]?.durations ?? []).reduce((a, b) => a + b, 0),
  }));
  const runOut = (run ?? []).map((r) => ({
    id: r.id,
    signup_id: r.signup_id,
    name: nameById[sigList.find((s) => s.id === r.signup_id)?.swimmer_id ?? ""] ??
      "Nuotatore",
    codes: testsBySignup[r.signup_id]?.codes ?? [],
    position: r.position,
    lane: r.lane,
    warmup_at: r.warmup_at,
    test_at: r.test_at,
    out_at: r.out_at,
    status: r.status,
  }));

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <Link
        href="/coach/videoanalisi"
        className="flex items-center gap-1 t-small text-muted hover:text-ink"
      >
        <ChevronLeft size={16} /> Videoanalisi
      </Link>

      <VideoEventManager
        event={{
          id: ev.id,
          title: ev.title,
          location: ev.location,
          window_start: ev.window_start,
          window_end: ev.window_end,
          lanes: ev.lanes,
          capacity: ev.capacity,
          runsheet_status: ev.runsheet_status,
        }}
        overrun={overrun}
        level={capacityLevel(overrun)}
        signups={signupsOut}
        runsheet={runOut}
      />
    </div>
  );
}
