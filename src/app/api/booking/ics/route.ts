import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** timestamp UTC in formato iCalendar: 20260715T103000Z */
const ical = (iso: string) =>
  new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

const esc = (s: string) =>
  s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

/**
 * GET /api/booking/ics?booking=<id> → file .ics con la lezione + reminder 24h.
 */
export async function GET(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("unauthorized", { status: 401 });

  const id = new URL(req.url).searchParams.get("booking") ?? "";
  if (!id) return new Response("bad request", { status: 400 });

  const admin = createAdminClient();
  const db = admin ?? (await createClient());
  const { data: b } = await db
    .from("bookings")
    .select("id, swimmer_id, starts_at, ends_at, mode, meet_url, services(name)")
    .eq("id", id)
    .maybeSingle();
  if (!b) return new Response("not found", { status: 404 });
  if (b.swimmer_id !== profile.id && profile.role !== "coach")
    return new Response("forbidden", { status: 403 });

  const svc = b.services as unknown as { name?: string } | null;
  const title = svc?.name ?? "Lezione GLIDE";
  const where =
    b.mode === "remote"
      ? b.meet_url
        ? `Video: ${b.meet_url}`
        : "Video call"
      : "Piscina di Livorno";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GLIDE//Booking//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:glide-${b.id}@glide`,
    `DTSTAMP:${ical(new Date().toISOString())}`,
    `DTSTART:${ical(b.starts_at)}`,
    `DTEND:${ical(b.ends_at)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc(where)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc("Promemoria: " + title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return new Response(lines.join("\r\n"), {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": 'attachment; filename="glide-lezione.ics"',
    },
  });
}
