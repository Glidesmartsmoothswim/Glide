import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { WaveLogo } from "@/components/brand/wave-logo";
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
  const [profRes, progRes, notifRes, wRes] = await Promise.all([
    supabase.from("profiles").select("onboarding_done").eq("id", sid).maybeSingle(),
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
  const workouts = (wRes.data ?? []) as {
    id: string;
    title: string;
    week_day: string | null;
    kind: string;
  }[];

  return (
    <div className="flex flex-col gap-6">
      <Onboarding done={Boolean(prof?.onboarding_done)} />
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Ciao {name},</p>
          <h1 className="font-display text-2xl text-foreground">Oggi</h1>
        </div>
        <WaveLogo height={30} />
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
        <ReadinessCheckin workouts={workouts} />
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
