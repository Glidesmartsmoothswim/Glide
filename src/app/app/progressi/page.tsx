import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { ReadinessProgress } from "@/components/readiness/progress";
import type { ReadinessRow } from "@/lib/readiness";

export const metadata = { title: "Progressi" };

export default async function SwimmerProgressi() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("readiness")
    .select("*")
    .eq("swimmer_id", profile?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(60);
  const rows = (data ?? []) as ReadinessRow[];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="font-display text-2xl text-foreground">Progressi</h1>
        <p className="text-sm text-muted">
          Prontezza e sforzo nel tempo, dai tuoi check-in.
        </p>
      </header>
      <ReadinessProgress rows={rows} />
    </div>
  );
}
