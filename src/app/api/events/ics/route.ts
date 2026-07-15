import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ical = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

/**
 * GET /api/events/ics?event=<id> → .ics della riga di scaletta del NUOTATORE.
 * La RLS (r_run) restituisce solo la sua riga e solo se la scaletta è pubblicata.
 */
export async function GET(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("unauthorized", { status: 401 });

  const eventId = new URL(req.url).searchParams.get("event") ?? "";
  if (!eventId) return new Response("bad request", { status: 400 });

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("runsheet")
    .select("warmup_at, test_at, out_at, lane, events(title, location)")
    .eq("event_id", eventId)
    .limit(1);
  const r = rows?.[0];
  if (!r) return new Response("not found", { status: 404 });

  const ev = r.events as unknown as { title?: string; location?: string } | null;
  const title = ev?.title ?? "Videoanalisi GLIDE";
  const where = ev?.location ?? "Piscina";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GLIDE//Videoanalisi//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:glide-run-${eventId}-${profile.id}@glide`,
    `DTSTAMP:${ical(new Date().toISOString())}`,
    `DTSTART:${ical(r.warmup_at)}`,
    `DTEND:${ical(r.out_at)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc(where)}`,
    `DESCRIPTION:${esc(`In acqua alle ${new Date(r.test_at).toLocaleTimeString("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" })} · corsia ${r.lane}. Presentati 15 minuti prima.`)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc("Videoanalisi tra un'ora")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Response(lines.join("\r\n"), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="glide-videoanalisi.ics"',
    },
  });
}
