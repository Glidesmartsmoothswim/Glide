import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fullName } from "@/lib/types";
import { romeDateStr } from "@/lib/booking/credits";
import { romeWallToUtc } from "@/lib/booking/slots";
import { CoachAgenda } from "@/components/agenda/coach-agenda";

export const metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const supabase = await createClient();
  const today = romeDateStr();
  // Mostra anche i booking recenti: da 2 giorni fa (mezzanotte di Roma).
  const fromIso = romeWallToUtc(today, -2 * 24 * 60).toISOString();

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
        "id, swimmer_id, service_id, starts_at, ends_at, mode, status, payment, payment_method, payment_status, amount_cents, receipt_number, coach_note, swimmer_note",
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

  // Registro di cassa (ADR-010/011): tutte le lezioni cash, senza limite di data.
  const { data: cashData } = await supabase
    .from("bookings")
    .select(
      "id, swimmer_id, service_id, starts_at, payment_status, amount_cents, receipt_number, paid_at",
    )
    .eq("payment_method", "cash")
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true });
  const cassa = cashData ?? [];

  const swimmerIds = [
    ...new Set([...bookings, ...cassa].map((b) => b.swimmer_id)),
  ];
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
          payment_method: b.payment_method,
          payment_status: b.payment_status,
          amount_cents: b.amount_cents,
          coach_note: b.coach_note,
          swimmer_note: b.swimmer_note,
        }))}
        events={evRes.data ?? []}
        initialTab={tab}
        cassa={cassa.map((c) => ({
          id: c.id,
          swimmer: nameById[c.swimmer_id] ?? "Nuotatore",
          service: svcById[c.service_id]?.name ?? "Lezione",
          starts_at: c.starts_at,
          payment_status: c.payment_status,
          amount_cents: c.amount_cents,
          receipt_number: c.receipt_number,
          paid_at: c.paid_at,
        }))}
      />
    </div>
  );
}
