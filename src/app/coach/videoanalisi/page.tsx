import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, Pill } from "@/components/ui/card";
import { VideoEventForm } from "@/components/videoanalisi/video-event-form";

export const metadata = { title: "Videoanalisi" };
export const dynamic = "force-dynamic";

const dt = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("it-IT", {
        timeZone: "Europe/Rome",
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : "—";

export default async function VideoanalisiPage() {
  await requireRole("coach");
  const supabase = await createClient();

  const { data: tests } = await supabase
    .from("tests")
    .select("id, name, duration_min, stroke, distance_m")
    .eq("active", true)
    .order("sort");

  const { data: events } = await supabase
    .from("events")
    .select(
      "id, title, starts_at, window_start, window_end, lanes, capacity, runsheet_status, location",
    )
    .eq("format", "videoanalisi")
    .order("starts_at", { ascending: false });

  const ids = (events ?? []).map((e) => e.id);
  const counts: Record<string, number> = {};
  if (ids.length) {
    const { data: signups } = await supabase
      .from("event_signups")
      .select("event_id")
      .in("event_id", ids)
      .in("status", ["in", "attended"]);
    for (const s of signups ?? [])
      counts[s.event_id] = (counts[s.event_id] ?? 0) + 1;
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blu to-navy text-white">
          <Clapperboard size={20} />
        </span>
        <div>
          <h1 className="t-h2">Videoanalisi</h1>
          <p className="t-small text-muted">
            Il nuotatore sceglie i test · l&apos;orario lo decidi tu
          </p>
        </div>
      </header>

      <VideoEventForm tests={tests ?? []} />

      <Card>
        <h2 className="t-h3 mb-3">Eventi</h2>
        {(events ?? []).length === 0 ? (
          <p className="t-small text-muted">Nessun evento videoanalisi.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {(events ?? []).map((e) => (
              <li key={e.id}>
                <Link
                  href={`/coach/videoanalisi/${e.id}`}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 hover:border-blu/40"
                >
                  <span className="font-semibold">{e.title}</span>
                  <span className="t-small text-muted">
                    {dt(e.window_start)}
                    {e.location ? ` · ${e.location}` : ""}
                  </span>
                  <span className="t-small text-muted">
                    · {counts[e.id] ?? 0}/{e.capacity ?? "∞"} iscritti · {e.lanes} corsie
                  </span>
                  <span className="ml-auto">
                    {e.runsheet_status === "published" ? (
                      <Pill tone="ok">Scaletta pubblicata</Pill>
                    ) : (
                      <Pill tone="warn">Bozza</Pill>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
