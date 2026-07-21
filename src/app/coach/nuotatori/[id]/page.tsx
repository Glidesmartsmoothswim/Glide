import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Card, Pill } from "@/components/ui/card";
import { WorkoutEditor } from "@/components/workout/editor";
import { CoachWorkoutCard } from "@/components/workout/coach-workout-card";
import { ReadinessProgress } from "@/components/readiness/progress";
import { EfficiencyCurves, type EffPoint } from "@/components/readiness/efficiency";
import { OndaCard, GlideScoreCard } from "@/components/score/score-cards";
import { computeScore } from "@/lib/score/compute";
import { BadgeShelf, type EarnedBadge } from "@/components/badges/badge-shelf";
import { ConferBadges } from "@/components/badges/confer-badges";
import { IdentityCard } from "@/components/identity/identity-card";
import { computeIdentity } from "@/lib/identity/compute";
import type { VReadinessRow } from "@/lib/readiness";
import { formatTempo } from "@/lib/profile/tempo";
import { STILE_LABEL, type Stile } from "@/lib/profile/costanti";
import {
  livelloLibero,
  OBIETTIVO_LABEL,
  ATHLETE_LABEL,
} from "@/lib/profile/intake";
import { ProgramManager } from "./program-manager";
import type { ProgramRow, PhaseRow } from "@/lib/programs";
import {
  OBJECTIVE_KIND_LABEL,
  OBJECTIVE_STATUS_LABEL,
  type ObjectiveRow,
} from "@/lib/objectives";
import { savePersonalWorkout } from "../../workout-actions";
import { archiveSwimmer } from "../actions";
import { EditSwimmerForm } from "./edit-form";
import {
  SERVICE_LABEL,
  fullName,
  initials,
  type SwimmerRow,
  type WorkoutRow,
} from "@/lib/types";

export default async function SwimmerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: s } = await supabase
    .from("profiles")
    .select(
      "id, role, first_name, last_name, email, phone, service_type, level, package, status, cert_status, cert_expiry, member_since",
    )
    .eq("id", id)
    .single();

  if (!s) notFound();
  const swimmer = s as SwimmerRow;

  const { data: wData } = await supabase
    .from("workouts")
    .select("*")
    .eq("swimmer_id", id)
    .eq("kind", "personal")
    .order("created_at", { ascending: false });
  const workouts = (wData ?? []) as WorkoutRow[];

  // Profilo atleta dichiarato (sola lettura lato coach).
  const { data: ath } = await supabase
    .from("profiles")
    .select("athlete_type, anno_nascita, categoria, stili_abituali, distanze_abituali")
    .eq("id", id)
    .single();
  const { data: pbs } = await supabase
    .from("personal_bests")
    .select("id, distanza_m, stile, vasca, tempo_cc")
    .eq("swimmer_id", id)
    .order("stile", { ascending: true })
    .order("distanza_m", { ascending: true });
  const { data: intake } = await supabase
    .from("intake")
    .select("*")
    .eq("user_id", id)
    .maybeSingle();
  // Livello (deterministico) SOLO per il percorso libero; mai mostrato al nuotatore.
  const livello =
    intake && ath?.athlete_type === "libero" ? livelloLibero(intake) : null;
  const hasAthProfile = Boolean(
    ath?.anno_nascita ||
      (ath?.stili_abituali?.length ?? 0) > 0 ||
      (pbs?.length ?? 0) > 0 ||
      intake,
  );

  // Programmazione 1:1 (coach): programmi + fasi + note.
  const { data: progData } = await supabase
    .from("programs")
    .select("*")
    .eq("swimmer_id", id)
    .order("created_at", { ascending: false });
  const progList = (progData ?? []) as ProgramRow[];
  const progIds = progList.map((p) => p.id);
  const { data: phaseData } = progIds.length
    ? await supabase.from("program_phases").select("*").in("program_id", progIds)
    : { data: [] };
  const { data: notesData } = progIds.length
    ? await supabase
        .from("program_notes")
        .select("program_id, notes")
        .in("program_id", progIds)
    : { data: [] };
  const notesByProg = new Map(
    (notesData ?? []).map((n) => [n.program_id as string, n.notes as string | null]),
  );
  const programsFull = progList.map((p) => ({
    ...p,
    phases: ((phaseData ?? []) as PhaseRow[])
      .filter((ph) => ph.program_id === p.id)
      .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    notes: notesByProg.get(p.id) ?? null,
  }));

  // Obiettivi multipli (Onda 13.3) — il coach li legge (RLS).
  const { data: objData } = await supabase
    .from("objectives")
    .select("*")
    .eq("swimmer_id", id)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  const objectives = (objData ?? []) as ObjectiveRow[];

  // Quante volte ogni scheda è stata "svolta" (per l'avviso in modifica).
  const { data: doneEv } = await supabase
    .from("activity_events")
    .select("payload")
    .eq("user_id", id)
    .eq("type", "workout.completed");
  const doneCount: Record<string, number> = {};
  (doneEv ?? []).forEach((e) => {
    const wid = (e.payload as { workout_id?: string } | null)?.workout_id;
    if (wid) doneCount[wid] = (doneCount[wid] ?? 0) + 1;
  });

  // Il coach legge la vista scomposta (fisica + mentale). Mai una media unica.
  const { data: rData } = await supabase
    .from("v_readiness")
    .select("*")
    .eq("swimmer_id", id)
    .order("created_at", { ascending: false })
    .limit(60);
  const readiness = (rData ?? []) as VReadinessRow[];

  const { data: effData } = await supabase
    .from("v_efficiency_points")
    .select("main_set_sig, rpe, created_at")
    .eq("swimmer_id", id)
    .order("created_at", { ascending: false })
    .limit(200);
  const effPoints = (effData ?? []) as EffPoint[];

  const { data: lastScore } = await supabase
    .from("glide_scores")
    .select("score, onda")
    .eq("swimmer_id", id)
    .order("week", { ascending: false })
    .limit(1)
    .maybeSingle();
  const score = await computeScore(
    supabase,
    id,
    lastScore?.score ?? null,
    lastScore?.onda ?? null,
  );
  const identity = await computeIdentity(supabase, id);

  // Badge: guadagnati + catalogo dei conferibili.
  const [{ data: sbData }, { data: catData }] = await Promise.all([
    supabase
      .from("swimmer_badges")
      .select("badge_code, note, badges(name, description, kind, sort)")
      .eq("swimmer_id", id),
    supabase
      .from("badges")
      .select("code, name, description")
      .eq("kind", "conferred")
      .order("sort"),
  ]);
  const earned: EarnedBadge[] = (sbData ?? [])
    .map((r) => {
      const b = r.badges as unknown as {
        name: string;
        description: string;
        kind: string;
        sort: number;
      } | null;
      return {
        code: r.badge_code as string,
        name: b?.name ?? r.badge_code,
        description: b?.description ?? "",
        note: (r.note as string | null) ?? null,
        conferred: b?.kind === "conferred",
        sort: b?.sort ?? 99,
      };
    })
    .sort((a, b) => a.sort - b.sort);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        href="/coach/nuotatori"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} /> Nuotatori
      </Link>

      <header className="flex items-center gap-4">
        <Avatar text={initials(swimmer)} />
        <div className="flex-1">
          <h1 className="font-display text-2xl text-foreground">
            {fullName(swimmer)}
          </h1>
          <p className="text-sm text-muted">
            {SERVICE_LABEL[swimmer.service_type]}
            {swimmer.email ? ` · ${swimmer.email}` : ""}
          </p>
        </div>
        {swimmer.package && <Pill tone="brand">{swimmer.package}</Pill>}
      </header>

      <Card>
        <h2 className="mb-4 font-display text-lg text-foreground">Scheda atleta</h2>
        <EditSwimmerForm s={swimmer} />
      </Card>

      {hasAthProfile && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg text-foreground">Profilo</h2>
            {ath?.athlete_type && (
              <Pill tone="brand">{ATHLETE_LABEL[ath.athlete_type as "agonista" | "libero"]}</Pill>
            )}
            {livello && <Pill tone="brand">Livello {livello}</Pill>}
          </div>
          <Card className="flex flex-col gap-2 text-sm">
            {intake?.goal_primary && (
              <div className="flex justify-between">
                <span className="text-muted">Obiettivo</span>
                <span className="font-semibold text-foreground">
                  {OBIETTIVO_LABEL[
                    intake.goal_primary as keyof typeof OBIETTIVO_LABEL
                  ] ?? intake.goal_primary}
                </span>
              </div>
            )}
            {intake?.freq_settimanale && (
              <div className="flex justify-between">
                <span className="text-muted">Frequenza / vasca</span>
                <span className="font-semibold text-foreground">
                  {intake.freq_settimanale}×/sett · {intake.vasca} m
                </span>
              </div>
            )}
            {ath?.categoria && (
              <div className="flex justify-between">
                <span className="text-muted">Categoria</span>
                <span className="font-semibold text-foreground">
                  {ath.categoria}
                  {ath?.anno_nascita ? ` · ${ath.anno_nascita}` : ""}
                </span>
              </div>
            )}
            {(ath?.stili_abituali?.length ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Stili</span>
                <span className="font-semibold text-foreground">
                  {ath!.stili_abituali
                    .map((s: string) => STILE_LABEL[s as Stile] ?? s)
                    .join(", ")}
                </span>
              </div>
            )}
            {(ath?.distanze_abituali?.length ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Distanze</span>
                <span className="font-semibold text-foreground">
                  {ath!.distanze_abituali
                    .map((d: string) => (d === "Fondo" ? "Fondo" : `${d} m`))
                    .join(", ")}
                </span>
              </div>
            )}
            {(pbs?.length ?? 0) > 0 && (
              <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
                <p className="text-muted">Personal best</p>
                {pbs!.map((pb) => (
                  <div key={pb.id} className="flex justify-between">
                    <span className="text-muted">
                      {pb.distanza_m} {pb.stile} · vasca {pb.vasca}
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatTempo(pb.tempo_cc)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">Progressi</h2>
        <IdentityCard identity={identity} />
        <OndaCard onda={score.onda} />
        <GlideScoreCard result={score} showBreakdown />
        <ReadinessProgress rows={readiness} />
        <EfficiencyCurves points={effPoints} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">Badge</h2>
        <BadgeShelf
          earned={earned}
          emptyHint="Ancora nessuno: i badge si guadagnano, non si regalano."
        />
        <ConferBadges
          swimmerId={id}
          conferred={(catData ?? []) as {
            code: string;
            name: string;
            description: string;
          }[]}
          earnedCodes={earned.map((b) => b.code)}
          paused={(swimmer.status ?? "attivo").toLowerCase() !== "attivo"}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">Obiettivi</h2>
        {objectives.length === 0 ? (
          <Card className="text-muted">
            Nessun obiettivo indicato dall&apos;atleta.
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {objectives.map((o: ObjectiveRow) => (
              <Card key={o.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {o.title}
                  </p>
                  <p className="text-xs text-muted">
                    {OBJECTIVE_KIND_LABEL[o.kind]}
                    {o.target_date ? ` · entro ${o.target_date}` : ""}
                  </p>
                </div>
                <Pill tone={o.status === "raggiunto" ? "ok" : o.status === "attivo" ? "brand" : "warn"}>
                  {OBJECTIVE_STATUS_LABEL[o.status]}
                </Pill>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">Programmazione</h2>
        <ProgramManager swimmerId={id} programs={programsFull} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">
          Nuova scheda personale
        </h2>
        <Card>
          <WorkoutEditor
            action={savePersonalWorkout}
            context="personal"
            swimmerId={swimmer.id}
            submitLabel="Salva scheda personale"
            successHref="#schede"
          />
        </Card>
      </section>

      {workouts.length > 0 && (
        <section id="schede" className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">
            Schede ({workouts.length})
          </h2>
          {workouts.map((w) => (
            <CoachWorkoutCard
              key={w.id}
              w={w}
              doneCount={doneCount[w.id] ?? 0}
            />
          ))}
        </section>
      )}

      <form action={archiveSwimmer} className="pt-2">
        <input type="hidden" name="id" value={swimmer.id} />
        <button
          type="submit"
          className="text-sm text-muted underline hover:text-[#DC2626]"
        >
          Archivia nuotatore (imposta “scaduto”)
        </button>
      </form>
    </div>
  );
}
