import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCreditStatus, ensureCreditPeriod } from "@/lib/booking/credits";
import { SwimmerBooking } from "@/components/booking/swimmer-booking";
import { UpcomingLessons } from "@/components/booking/upcoming-lessons";
import { SwimmerEvents } from "@/components/booking/swimmer-events";

export const metadata = { title: "Prenota" };
export const dynamic = "force-dynamic";

type Svc = {
  code: string;
  name: string;
  mode: string;
  duration_min: number;
  price_cents: number;
};

export default async function PrenotaPage() {
  const profile = await requireRole("swimmer");
  const supabase = await createClient();

  const { data: p } = await supabase
    .from("profiles")
    .select("service_type")
    .eq("id", profile.id)
    .single();

  // Garantisce il credito del periodo corrente (idempotente). Richiede admin.
  const admin = createAdminClient();
  if (admin) await ensureCreditPeriod(admin, profile.id, p?.service_type ?? null);

  const credit = await getCreditStatus(supabase, profile.id, p?.service_type ?? null);

  const { data: svcData } = await supabase
    .from("services")
    .select("code, name, mode, duration_min, price_cents")
    .eq("active", true)
    .order("sort");
  const services = ((svcData ?? []) as Svc[]).filter(
    (s) => s.mode !== "remote" || credit.remoteAllowed,
  );

  const { data: upData } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, mode, status, payment, service_id")
    .eq("swimmer_id", profile.id)
    .eq("status", "confirmed")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at");
  const serviceIds = [...new Set((upData ?? []).map((b) => b.service_id))];
  const { data: svcNames } = serviceIds.length
    ? await supabase.from("services").select("id, name").in("id", serviceIds)
    : { data: [] };
  const nameById = Object.fromEntries(
    (svcNames ?? []).map((s) => [s.id, s.name]),
  );
  const upcoming = (upData ?? []).map((b) => ({
    id: b.id,
    service: nameById[b.service_id] ?? "Lezione",
    starts_at: b.starts_at,
    mode: b.mode,
    payment: b.payment,
  }));

  const tier = p?.service_type ?? null;
  const { data: evData } = await supabase
    .from("events")
    .select(
      "id, title, kind, format, starts_at, window_start, location, mode, capacity, audience",
    )
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(12);
  type EvRow = {
    id: string;
    title: string;
    kind: string;
    format: string;
    starts_at: string;
    window_start: string | null;
    location: string | null;
    mode: string;
    capacity: number | null;
    audience: string[] | null;
  };
  const evAll = ((evData ?? []) as EvRow[]).filter(
    (e) => !tier || !e.audience || e.audience.includes(tier),
  );
  const vaIds = evAll.filter((e) => e.format === "videoanalisi").map((e) => e.id);

  // Test offerti dagli eventi videoanalisi
  const offeredByEvent: Record<
    string,
    { id: string; name: string; duration: number }[]
  > = {};
  if (vaIds.length) {
    const { data: et } = await supabase
      .from("event_tests")
      .select("event_id, tests(id, name, duration_min)")
      .in("event_id", vaIds);
    for (const r of et ?? []) {
      const t = r.tests as unknown as {
        id: string;
        name: string;
        duration_min: number;
      } | null;
      if (t)
        (offeredByEvent[r.event_id] ??= []).push({
          id: t.id,
          name: t.name,
          duration: t.duration_min,
        });
    }
  }

  // Le mie iscrizioni + test scelti + eventuale riga di scaletta (RLS: solo se pubblicata)
  const { data: mySignups } = await supabase
    .from("event_signups")
    .select("id, event_id, status")
    .eq("swimmer_id", profile.id);
  const signupByEvent = Object.fromEntries(
    (mySignups ?? []).map((s) => [s.event_id, s]),
  );
  const evBySignup = Object.fromEntries(
    (mySignups ?? []).map((s) => [s.id, s.event_id]),
  );
  const myTestsByEvent: Record<string, string[]> = {};
  const mySignupIds = (mySignups ?? []).map((s) => s.id);
  if (mySignupIds.length) {
    const { data: mt } = await supabase
      .from("signup_tests")
      .select("signup_id, test_id")
      .in("signup_id", mySignupIds);
    for (const r of mt ?? []) {
      const ev = evBySignup[r.signup_id];
      if (ev) (myTestsByEvent[ev] ??= []).push(r.test_id);
    }
  }
  const slotByEvent: Record<
    string,
    { warmup: string; test: string; out: string; lane: number }
  > = {};
  if (vaIds.length) {
    const { data: rs } = await supabase
      .from("runsheet")
      .select("event_id, warmup_at, test_at, out_at, lane")
      .in("event_id", vaIds);
    for (const r of rs ?? [])
      slotByEvent[r.event_id] = {
        warmup: r.warmup_at,
        test: r.test_at,
        out: r.out_at,
        lane: r.lane,
      };
  }

  const events = evAll.map((e) => ({
    id: e.id,
    title: e.title,
    kind: e.kind,
    format: e.format,
    starts_at: e.window_start ?? e.starts_at,
    location: e.location,
    offeredTests: offeredByEvent[e.id] ?? [],
    myStatus: signupByEvent[e.id]?.status ?? null,
    myTests: myTestsByEvent[e.id] ?? [],
    slot: slotByEvent[e.id] ?? null,
  }));

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 px-4 pb-24 pt-6">
      <header>
        <h1 className="t-h2">Prenota</h1>
        <p className="t-small text-muted">
          {credit.remaining > 0
            ? `${credit.remaining} lezione inclusa questo mese`
            : credit.granted > 0
              ? "Crediti esauriti · lezione extra"
              : "Prenota una lezione"}
        </p>
      </header>

      {upcoming.length > 0 && <UpcomingLessons lessons={upcoming} />}

      <SwimmerBooking services={services} credit={credit} />

      <SwimmerEvents events={events} />
    </div>
  );
}
