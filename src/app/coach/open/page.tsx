import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Pill } from "@/components/ui/card";
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

  // Onda 27.2 — Preferenze: cosa scelgono gli iscritti Open, in aggregato
  // (mai per singolo nome qui: quello resta nella scheda del nuotatore).
  const [swimmerCountRes, compAggRes, adjEvRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .in("tier", ["open", "open_plus"]),
    supabase
      .from("workout_completions")
      .select("focus")
      .eq("source", "open_channel")
      .limit(1000),
    supabase.from("activity_events").select("payload").eq("type", "workout.adjusted"),
  ]);
  const openSwimmers = swimmerCountRes.count ?? 0;

  const focusCount: Record<string, number> = {};
  (compAggRes.data ?? []).forEach((c) => {
    const f = (c.focus as string | null) || "Senza focus";
    focusCount[f] = (focusCount[f] ?? 0) + 1;
  });
  const focusTotal = Object.values(focusCount).reduce((a, b) => a + b, 0);
  const focusRanked = Object.entries(focusCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const adjCount = { riduci: 0, aumenta: 0 };
  (adjEvRes.data ?? []).forEach((e) => {
    const dir = (e.payload as { direction?: string } | null)?.direction;
    if (dir === "riduci") adjCount.riduci++;
    if (dir === "aumenta") adjCount.aumenta++;
  });

  const weekItems = byWeek.find((g) => g.isCurrent)?.items ?? [];

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
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg text-foreground">Preferenze</h2>
          <Pill tone="brand">test</Pill>
        </div>
        <p className="text-sm text-muted">
          Cosa scelgono gli iscritti Open — in aggregato, mai per nome (quello
          resta nella scheda del nuotatore).
        </p>

        {weekItems.length > 0 && openSwimmers > 0 && (
          <Card className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-foreground">
              Tasso di scelta — settimana corrente
            </p>
            {weekItems.map((w) => {
              const pct = Math.round(((doneCount[w.id] ?? 0) / openSwimmers) * 100);
              return (
                <div key={w.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{w.title}</span>
                    <span className="text-muted">
                      {doneCount[w.id] ?? 0}/{openSwimmers} · {pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-blu"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </Card>
        )}

        {focusRanked.length > 0 && (
          <Card className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-foreground">
              Focus più scelti (tutte le settimane)
            </p>
            {focusRanked.map(([focus, n]) => (
              <div key={focus} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{focus}</span>
                <span className="text-muted">
                  {n} · {focusTotal ? Math.round((n / focusTotal) * 100) : 0}%
                </span>
              </div>
            ))}
          </Card>
        )}

        {(adjCount.riduci > 0 || adjCount.aumenta > 0) && (
          <Card className="flex items-center justify-between text-sm">
            <span className="text-foreground">Personalizzazione volume</span>
            <span className="text-muted">
              {adjCount.riduci} hanno ridotto · {adjCount.aumenta} hanno aumentato
            </span>
          </Card>
        )}
      </section>

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
