import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fullName } from "@/lib/types";
import { romeDateStr } from "@/lib/booking/credits";
import { CoachAgenda } from "@/components/agenda/coach-agenda";

export const metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const supabase = await createClient();
  const today = romeDateStr();
  const fromIso = new Date(Date.now() - 2 * 86_400_000).toISOString();

  const [rulesRes, excRes, bookRes, svcRes, evRes] = await Promise.all([
    supabase
      .from("availability_rules")
      .select("id, weekday, start_time, end_time, slot_step, modes, label")
      .order("weekday")
      .order("start_time"),
    supabase
      .from("availability_exceptions")
      .select("id, day, kind, start_time, end_time, note")
      .gte("day", today)
      .order("day"),
    supabase
      .from("bookings")
      .select(
        "id, swimmer_id, service_id, starts_at, ends_at, mode, status, payment, coach_note, swimmer_note",
      )
      .neq("status", "cancelled")
      .gte("starts_at", fromIso)
      .order("starts_at"),
    supabase.from("services").select("id, code, name, mode"),
    supabase
      .from("events")
      .select(
        "id, title, kind, starts_at, ends_at, location, mode, capacity, blocks_calendar, status",
      )
      .neq("status", "cancelled")
      .gte("starts_at", fromIso)
      .order("starts_at"),
  ]);

  const bookings = bookRes.data ?? [];
  const swimmerIds = [...new Set(bookings.map((b) => b.swimmer_id))];
  const { data: swimmers } = swimmerIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", swimmerIds)
    : { data: [] };
  const nameById = Object.fromEntries(
    (swimmers ?? []).map((s) => [s.id, fullName(s)]),
  );
  const svcById = Object.fromEntries(
    (svcRes.data ?? []).map((s) => [s.id, s]),
  );

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blu to-navy text-white">
          <CalendarClock size={20} />
        </span>
        <div>
          <h1 className="t-h2">Agenda</h1>
          <p className="t-small text-muted">
            Disponibilità, prenotazioni ed eventi · fuso Europe/Rome
          </p>
        </div>
      </header>

      <CoachAgenda
        rules={rulesRes.data ?? []}
        exceptions={excRes.data ?? []}
        bookings={bookings.map((b) => ({
          id: b.id,
          swimmer: nameById[b.swimmer_id] ?? "Nuotatore",
          service: svcById[b.service_id]?.name ?? "Lezione",
          starts_at: b.starts_at,
          ends_at: b.ends_at,
          mode: b.mode,
          status: b.status,
          payment: b.payment,
          coach_note: b.coach_note,
          swimmer_note: b.swimmer_note,
        }))}
        events={evRes.data ?? []}
      />
    </div>
  );
}
