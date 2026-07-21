import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { WaveLogo } from "@/components/brand/wave-logo";
import { HomeGreeting } from "@/components/home/home-greeting";
import { ReadinessCheckin } from "@/components/readiness/checkin";
import { NotifList } from "@/components/notifications/notif-list";
import { Onboarding } from "@/components/onboarding/onboarding";
import { ProgramHomeCard } from "@/components/programs/program-home-card";
import type { NotificationRow } from "@/lib/notifications";
import type { ProgramRow, PhaseRow } from "@/lib/programs";

export default async function SwimmerToday() {
  const profile = await getCurrentProfile();
  const name = profile?.first_name || "nuotatore";

  const supabase = await createClient();

  // Onda 14.2: query indipendenti in parallelo. Le fasi dipendono dal
  // programma attivo → restano dopo (unica dipendenza reale).
  const sid = profile?.id ?? "";
  const [profRes, progRes, notifRes, wRes, lastCheckinRes, bookingRes] =
    await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_done, status")
      .eq("id", sid)
      .maybeSingle(),
    supabase
      .from("programs")
      .select("*")
      .eq("swimmer_id", sid)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", sid)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("workouts")
      .select("id, title, week_day, kind")
      .or(`swimmer_id.eq.${sid},kind.eq.open_channel`)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("readiness")
      .select("phase, created_at")
      .eq("swimmer_id", sid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("starts_at, mode")
      .eq("swimmer_id", sid)
      .neq("status", "cancelled")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  const prof = profRes.data;
  const activeProg = progRes.data;
  const { data: progPhases } = activeProg
    ? await supabase
        .from("program_phases")
        .select("*")
        .eq("program_id", activeProg.id)
    : { data: [] };
  const notifs = (notifRes.data ?? []) as NotificationRow[];

  // Rientro dopo il pre: se l'ultimo check-in è un "pre" recente (< 18h) e non
  // è ancora seguito da un "post", proponiamo direttamente il post-sessione.
  const lastCheckin = lastCheckinRes.data as
    | { phase: string; created_at: string }
    | null;
  const promptPost =
    lastCheckin?.phase === "pre" &&
    Date.now() - new Date(lastCheckin.created_at).getTime() < 18 * 60 * 60 * 1000;

  // Saluto: stato pausa + eventuale sessione di OGGI (ora + vasca/video).
  const isPaused = (prof as { status?: string } | null)?.status === "in_pausa";
  const nextBooking = bookingRes.data as
    | { starts_at: string; mode: string }
    | null;
  const romeDay = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(d);
  let sessionLabel: string | null = null;
  if (nextBooking && romeDay(new Date(nextBooking.starts_at)) === romeDay(new Date())) {
    const ora = new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(nextBooking.starts_at));
    sessionLabel = `${ora} · ${nextBooking.mode === "remote" ? "Video" : "Vasca"}`;
  }
  const workouts = (wRes.data ?? []) as {
    id: string;
    title: string;
    week_day: string | null;
    kind: string;
  }[];

  return (
    <div className="flex flex-col gap-6">
      <Onboarding done={Boolean(prof?.onboarding_done)} />
      <header>
        <div className="mb-1 flex justify-end">
          <WaveLogo height={24} />
        </div>
        <HomeGreeting
          firstName={name}
          isPaused={isPaused}
          sessionLabel={sessionLabel}
        />
      </header>

      {activeProg && (
        <ProgramHomeCard
          program={activeProg as ProgramRow}
          phases={(progPhases ?? []) as PhaseRow[]}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">Check-in</h2>
        <p className="text-sm text-muted">
          Registra come stai prima e dopo la vasca — onda dopo onda.
        </p>
        <ReadinessCheckin workouts={workouts} promptPost={promptPost} />
      </section>

      {notifs.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Notifiche</h2>
          <NotifList rows={notifs} />
        </section>
      )}
    </div>
  );
}
