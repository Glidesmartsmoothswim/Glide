import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { WorkoutCard } from "@/components/workout/workout-card";
import { WorkoutHand } from "@/components/workout/workout-hand";
import { UpgradeHint } from "@/components/access/upgrade-hint";
import { Archive } from "lucide-react";
import { canAccess, accessTier } from "@/lib/access";
import { SelfWorkoutManager } from "@/components/workout/self-editor";
import { mainZone } from "@/lib/workout";
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
  const tier = profile ? accessTier(profile) : "free";
  const supabase = await createClient();

  // Onda 14.2: le tre query sono indipendenti → in parallelo (Promise.all),
  // non più a cascata. La RLS gata comunque il Canale Open per tier.
  const weekAccess = canAccess(tier, "open:week");
  const selfAccess = canAccess(tier, "open:self");
  // PROMPT_CODE_PAGAMENTI TASK 6 (01/09/2026): la "scheda personale di
  // allenamento" (workouts kind='personal', assegnata dal coach) non è
  // prevista per open/open_plus/free — solo 1:1 Elite.
  const personalAccess = tier === "one_to_one";
  const sid = profile?.id ?? "";
  const [personalRes, openRes, doneRes, selfRes] = await Promise.all([
    personalAccess
      ? supabase
          .from("workouts")
          .select("*")
          .eq("kind", "personal")
          .eq("swimmer_id", sid)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as WorkoutRow[] }),
    weekAccess
      ? supabase
          .from("workouts")
          .select("*")
          .eq("kind", "open_channel")
          .eq("week_start", currentMonday())
          .order("focus", { ascending: true })
      : Promise.resolve({ data: [] as WorkoutRow[] }),
    supabase
      .from("workout_completions")
      .select(
        "id, workout_id, title, focus, week_start, total_meters, completed_at",
      )
      .eq("swimmer_id", sid)
      .order("completed_at", { ascending: false })
      .limit(60),
    // ADR-012 (Onda 29.5): il proprio builder self-service, solo Open/Open+.
    selfAccess
      ? supabase
          .from("workouts")
          .select("*")
          .eq("kind", "self")
          .eq("swimmer_id", sid)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as WorkoutRow[] }),
  ]);
  const personal = (personalRes.data ?? []) as WorkoutRow[];
  const week = (openRes.data ?? []) as WorkoutRow[];
  const done = (doneRes.data ?? []) as CompletionRow[];
  const selfWorkouts = (selfRes.data ?? []) as WorkoutRow[];
  const doneIds = new Set(done.map((d) => d.workout_id).filter(Boolean));

  // TASK 8 (feedback 29/08): "le tue schede" e "i miei allenamenti"
  // mostravano la stessa cosa in due punti diversi, senza uno scopo
  // distinto. Ora: "le tue schede" = solo da svolgere (programma attivo),
  // "i miei allenamenti" = indice completo, fatti + da fare, ogni riga
  // apribile sul dettaglio (/app/nuoto/[id], che ora mostra note/RPE/
  // readiness per le sedute già completate).
  const toRow = (w: WorkoutRow) => ({
    id: w.id,
    title: w.title,
    focus: w.focus,
    totalMeters: w.total_meters,
    done: false as const,
    dateLabel: "Da fare",
    href: `/app/nuoto/${w.id}`,
  });
  const allAllenamenti = [
    ...personal.filter((w) => !doneIds.has(w.id)).map(toRow),
    ...selfWorkouts.filter((w) => !doneIds.has(w.id)).map(toRow),
    ...done.map((d) => ({
      id: d.id,
      title: d.title,
      focus: d.focus,
      totalMeters: d.total_meters,
      done: true as const,
      dateLabel: new Date(d.completed_at).toLocaleDateString("it-IT", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      href: d.workout_id ? `/app/nuoto/${d.workout_id}` : null,
    })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl text-foreground">Nuoto</h1>
        <p className="text-sm text-muted">Le tue schede e il Canale Open.</p>
      </header>

      {personal.filter((w) => !doneIds.has(w.id)).length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Le tue schede</h2>
          {personal
            .filter((w) => !doneIds.has(w.id))
            .map((w) => (
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
              Scegli tu quali e quanti farne: 1, 2 o 3. Toccale come una mano di
              carte.
            </p>
            <WorkoutHand
              workouts={week.map((w) => ({
                id: w.id,
                title: w.title,
                focus: w.focus,
                total_meters: w.total_meters,
                pool: w.pool,
                zone: mainZone(w.blocks),
                done: doneIds.has(w.id),
              }))}
            />
          </>
        )}
      </section>

      {selfAccess && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-display text-lg text-foreground">Il tuo allenamento</h2>
            <p className="text-sm text-muted">
              Scrivi una seduta tua, con la stessa notazione del coach. Resta
              tua: non entra nel Canale Open né nell&apos;aderenza al programma.
            </p>
          </div>
          <SelfWorkoutManager items={selfWorkouts} />
        </section>
      )}

      {canAccess(tier, "open:archive") ? (
        <Link
          href="/app/nuoto/archivio"
          className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-blu"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-background text-blu">
            <Archive size={18} />
          </span>
          <div className="flex-1">
            <p className="font-bold text-foreground">Archivio Open</p>
            <p className="text-sm text-muted">
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
        <div>
          <h2 className="font-display text-lg text-foreground">I miei allenamenti</h2>
          <p className="text-sm text-muted">Tutto: fatti e da fare, in un unico elenco.</p>
        </div>
        {allAllenamenti.length === 0 ? (
          <Card className="text-muted">
            Qui trovi tutti i tuoi allenamenti — fatti e da fare.
          </Card>
        ) : (
          allAllenamenti.map((a) => (
            <Card key={a.id} className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-background text-muted">
                <CalendarRange size={17} />
              </span>
              <div className="flex-1">
                <p className="font-bold text-foreground">{a.title}</p>
                <p className="text-sm text-muted">
                  {a.done ? (
                    a.dateLabel
                  ) : (
                    <span className="font-bold text-blu">Da fare</span>
                  )}
                  {a.focus ? ` · ${a.focus}` : ""}
                  {a.totalMeters
                    ? ` · ${a.totalMeters.toLocaleString("it-IT")} m`
                    : ""}
                </p>
              </div>
              {a.href && (
                <Link href={a.href} className="text-sm font-bold text-blu">
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
