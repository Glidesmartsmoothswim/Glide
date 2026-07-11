import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { WorkoutCard } from "@/components/workout/workout-card";
import type { WorkoutRow } from "@/lib/types";

export const metadata = { title: "Nuoto" };

export default async function SwimmerNuoto() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  // Schede personali (RLS: solo le proprie).
  const { data: personalData } = await supabase
    .from("workouts")
    .select("*")
    .eq("kind", "personal")
    .eq("swimmer_id", profile?.id ?? "")
    .order("created_at", { ascending: false });
  const personal = (personalData ?? []) as WorkoutRow[];

  // Canale Open (RLS: leggibile da tutti gli autenticati).
  const { data: openData } = await supabase
    .from("workouts")
    .select("*")
    .eq("kind", "open_channel")
    .order("published_at", { ascending: false });
  const open = (openData ?? []) as WorkoutRow[];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl text-foreground">Nuoto</h1>
        <p className="text-sm text-muted">Le tue schede e il Canale Open.</p>
      </header>

      {personal.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">
            Le tue schede
          </h2>
          {personal.map((w) => (
            <WorkoutCard key={w.id} w={w} />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">Canale Open</h2>
        {open.length === 0 ? (
          <Card className="text-muted">
            Ancora nessun allenamento pubblicato. Torna presto — onda dopo onda.
          </Card>
        ) : (
          open.map((w) => <WorkoutCard key={w.id} w={w} />)
        )}
      </section>
    </div>
  );
}
