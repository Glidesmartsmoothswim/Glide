import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { WorkoutEditor } from "@/components/workout/editor";
import { CoachWorkoutCard } from "@/components/workout/coach-workout-card";
import { saveOpenWorkout } from "../workout-actions";
import { formatWeek, currentMonday } from "@/lib/week";
import { type WorkoutRow } from "@/lib/types";

export const metadata = { title: "Canale Open" };

export default async function CanaleOpen() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("*")
    .eq("kind", "open_channel")
    .order("published_at", { ascending: false });
  const workouts = (data ?? []) as WorkoutRow[];

  // Quante volte ogni allenamento Open è stato svolto (coach vede tutto).
  const { data: doneEv } = await supabase
    .from("activity_events")
    .select("payload")
    .eq("type", "workout.completed");
  const doneCount: Record<string, number> = {};
  (doneEv ?? []).forEach((e) => {
    const wid = (e.payload as { workout_id?: string } | null)?.workout_id;
    if (wid) doneCount[wid] = (doneCount[wid] ?? 0) + 1;
  });

  // Raggruppa per settimana (week_start), la più recente in alto.
  const cur = currentMonday();
  const weeks = [...new Set(workouts.map((w) => w.week_start ?? ""))].sort(
    (a, b) => (a < b ? 1 : a > b ? -1 : 0),
  );
  const byWeek = weeks.map((wk) => ({
    week: wk,
    isCurrent: wk === cur,
    items: workouts.filter((w) => (w.week_start ?? "") === wk),
  }));

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
            successHref="#pubblicati"
          />
        </Card>
      </section>

      <section id="pubblicati" className="flex flex-col gap-4">
        <h2 className="font-display text-lg text-foreground">
          Pubblicati ({workouts.length})
        </h2>
        {workouts.length === 0 ? (
          <Card className="text-muted">
            Ancora nessun allenamento pubblicato sul Canale Open.
          </Card>
        ) : (
          byWeek.map((g) => (
            <div key={g.week || "no-week"} className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-muted">
                {g.week ? formatWeek(g.week) : "Senza settimana"}
                {g.isCurrent && (
                  <span className="ml-2 rounded bg-turchese/15 px-1.5 py-0.5 text-xs text-teal">
                    corrente
                  </span>
                )}
              </h3>
              {g.items.map((w) => (
                <CoachWorkoutCard
                  key={w.id}
                  w={w}
                  doneCount={doneCount[w.id] ?? 0}
                />
              ))}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
