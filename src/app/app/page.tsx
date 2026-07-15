import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { WaveLogo } from "@/components/brand/wave-logo";
import { ReadinessCheckin } from "@/components/readiness/checkin";
import { NotifList } from "@/components/notifications/notif-list";
import { Onboarding } from "@/components/onboarding/onboarding";
import type { NotificationRow } from "@/lib/notifications";

export default async function SwimmerToday() {
  const profile = await getCurrentProfile();
  const name = profile?.first_name || "nuotatore";

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(10);
  const notifs = (data ?? []) as NotificationRow[];

  // Allenamenti selezionabili nel check-in post (per la firma del set).
  const { data: wData } = await supabase
    .from("workouts")
    .select("id, title, week_day, kind")
    .or(`swimmer_id.eq.${profile?.id ?? ""},kind.eq.open_channel`)
    .order("created_at", { ascending: false })
    .limit(30);
  const workouts = (wData ?? []) as {
    id: string;
    title: string;
    week_day: string | null;
    kind: string;
  }[];

  return (
    <div className="flex flex-col gap-6">
      <Onboarding />
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Ciao {name},</p>
          <h1 className="font-display text-2xl text-foreground">Oggi</h1>
        </div>
        <WaveLogo size={36} />
      </header>

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
