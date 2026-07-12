import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { NotifList } from "@/components/notifications/notif-list";
import type { NotificationRow } from "@/lib/notifications";

export const metadata = { title: "Notifiche" };

export default async function CoachNotifiche() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(50);
  const rows = (data ?? []) as NotificationRow[];

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blu to-navy text-white">
          <Bell size={20} />
        </span>
        <div>
          <h1 className="font-display text-2xl text-foreground">Notifiche</h1>
          <p className="text-sm text-muted">Eventi dai tuoi atleti.</p>
        </div>
      </header>
      <NotifList rows={rows} />
    </div>
  );
}
