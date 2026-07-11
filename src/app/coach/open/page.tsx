import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { WorkoutEditor } from "@/components/workout/editor";
import { WorkoutCard } from "@/components/workout/workout-card";
import { saveOpenWorkout } from "../workout-actions";
import { WEEK_DAYS, type WorkoutRow } from "@/lib/types";

export const metadata = { title: "Canale Open" };

export default async function CanaleOpen() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("*")
    .eq("kind", "open_channel")
    .order("published_at", { ascending: false });
  const workouts = (data ?? []) as WorkoutRow[];

  const byDay = WEEK_DAYS.map((d) => ({
    day: d,
    items: workouts.filter((w) => w.week_day === d),
  })).filter((g) => g.items.length);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blu to-navy text-white">
          <Radio size={20} />
        </span>
        <div>
          <h1 className="font-display text-2xl text-foreground">Canale Open</h1>
          <p className="text-sm text-muted">
            Pubblica un allenamento visibile a tutti gli iscritti Open.
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">
          Nuovo allenamento Open
        </h2>
        <Card>
          <WorkoutEditor
            action={saveOpenWorkout}
            context="open"
            submitLabel="Pubblica sul Canale Open"
          />
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg text-foreground">
          Pubblicati ({workouts.length})
        </h2>
        {workouts.length === 0 ? (
          <Card className="text-muted">
            Ancora nessun allenamento pubblicato sul Canale Open.
          </Card>
        ) : (
          byDay.map((g) => (
            <div key={g.day} className="flex flex-col gap-3">
              {g.items.map((w) => (
                <WorkoutCard key={w.id} w={w} />
              ))}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
