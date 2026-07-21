import Link from "next/link";
import { Check, CalendarRange } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { WorkoutCard } from "@/components/workout/workout-card";
import { UpgradeHint } from "@/components/access/upgrade-hint";
import { Archive } from "lucide-react";
import { canAccess } from "@/lib/access";
import { currentMonday, formatWeek } from "@/lib/week";
import type { WorkoutRow } from "@/lib/types";

export const metadata = { title: "Nuoto" };

type CompletionRow = {
  id: string;
  workout_id: string | null;
  title: string;
  focus: string | null;
  week_start: string | null;
  total_meters: number | null;
  completed_at: string;
};

export default async function SwimmerNuoto() {
  const profile = await getCurrentProfile();
  const tier = profile?.tier ?? "free";
  const supabase = await createClient();

  // Schede personali 1:1 (RLS: solo le proprie).
  const { data: personalData } = await supabase
    .from("workouts")
    .select("*")
    .eq("kind", "personal")
    .eq("swimmer_id", profile?.id ?? "")
    .order("created_at", { ascending: false });
  const personal = (personalData ?? []) as WorkoutRow[];

  // La tua settimana: Canale Open della settimana CORRENTE. La RLS già gata
  // per tier (open/open_plus la vedono, free no); qui restringiamo alla
  // settimana corrente (open_plus vede lo storico dall'Archivio, 12.4).
  const weekAccess = canAccess(tier, "open:week");
  const { data: openData } = weekAccess
    ? await supabase
        .from("workouts")
        .select("*")
        .eq("kind", "open_channel")
        .eq("week_start", currentMonday())
        .order("focus", { ascending: true })
    : { data: [] };
  const week = (openData ?? []) as WorkoutRow[];

  // Archivio personale svolti (sempre visibile al proprietario).
  const { data: doneData } = await supabase
    .from("workout_completions")
    .select("id, workout_id, title, focus, week_start, total_meters, completed_at")
    .eq("swimmer_id", profile?.id ?? "")
    .order("completed_at", { ascending: false })
    .limit(60);
  const done = (doneData ?? []) as CompletionRow[];
  const doneIds = new Set(done.map((d) => d.workout_id).filter(Boolean));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl text-foreground">Nuoto</h1>
        <p className="text-sm text-muted">Le tue schede e il Canale Open.</p>
      </header>

      {personal.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Le tue schede</h2>
          {personal.map((w) => (
            <WorkoutCard key={w.id} w={w} />
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-lg text-foreground">La tua settimana</h2>
          <p className="text-sm text-muted">{formatWeek(currentMonday())}</p>
        </div>

        {!weekAccess ? (
          <UpgradeHint
            target="open"
            message="Il Canale Open è incluso nel piano Open: una settimana di allenamenti da scegliere liberamente."
          />
        ) : week.length === 0 ? (
          <Card className="text-muted">
            Ancora nessun allenamento per questa settimana. Torna presto.
          </Card>
        ) : (
          <>
            <p className="text-sm text-foreground">
              Scegli tu quali e quanti farne: 1, 2 o 3.
            </p>
            {week.map((w) => (
              <div key={w.id} className="flex flex-col gap-1">
                {doneIds.has(w.id) && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal">
                    <Check size={13} /> Svolto
                  </span>
                )}
                <WorkoutCard w={w} />
              </div>
            ))}
          </>
        )}
      </section>

      {canAccess(tier, "open:archive") ? (
        <Link
          href="/app/nuoto/archivio"
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-blu"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-background text-blu">
            <Archive size={18} />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Archivio Open</p>
            <p className="text-xs text-muted">
              Tutti gli allenamenti passati — scegli e rifai.
            </p>
          </div>
        </Link>
      ) : (
        weekAccess && (
          <UpgradeHint
            target="open_plus"
            message="Vuoi anche l'archivio storico completo? È in Open+."
          />
        )
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">I miei allenamenti</h2>
        {done.length === 0 ? (
          <Card className="text-muted">
            Qui restano gli allenamenti che hai svolto — anche a settimana finita.
          </Card>
        ) : (
          done.map((d) => (
            <Card key={d.id} className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background text-muted">
                <CalendarRange size={17} />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{d.title}</p>
                <p className="text-xs text-muted">
                  {new Date(d.completed_at).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {d.focus ? ` · ${d.focus}` : ""}
                  {d.total_meters
                    ? ` · ${d.total_meters.toLocaleString("it-IT")} m`
                    : ""}
                </p>
              </div>
              {d.workout_id && (
                <Link
                  href={`/app/nuoto/${d.workout_id}`}
                  className="text-sm font-semibold text-blu"
                >
                  Apri
                </Link>
              )}
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
