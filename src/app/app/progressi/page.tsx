import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { SwimmerProgress } from "@/components/readiness/progress";
import { Card } from "@/components/ui/card";
import { EfficiencyCurves, type EffPoint } from "@/components/readiness/efficiency";
import { OndaCard, GlideScoreCard } from "@/components/score/score-cards";
import { computeScore } from "@/lib/score/compute";
import { IdentityCard } from "@/components/identity/identity-card";
import { computeIdentity } from "@/lib/identity/compute";
import type { EffettoAcquaRow } from "@/lib/readiness";
import { Torta } from "@/components/charts/Torta";
import { CurvaCarico } from "@/components/charts/CurvaCarico";
import {
  distribuzioneWorkout,
  buildSettimane,
  toFette,
  type WorkoutForStats,
} from "@/lib/workout-stats";
import type { ZonaBucket } from "@/lib/chart-tokens";

export const metadata = { title: "Progressi" };
export const dynamic = "force-dynamic";

export default async function SwimmerProgressi() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  // Percorso "libero": niente Glide Score né 6 profili (spec Intake §4).
  // Restano Onda, Effetto Acqua, curva pace@RPE.
  const { data: prof } = await supabase
    .from("profiles")
    .select("athlete_type")
    .eq("id", profile?.id ?? "")
    .maybeSingle();
  const libero = prof?.athlete_type === "libero";

  // Onda + Glide Score (calcolo on-demand; l'ultimo salvato dà l'inerzia).
  const { data: lastScore } = await supabase
    .from("glide_scores")
    .select("score, onda")
    .eq("swimmer_id", profile?.id ?? "")
    .order("week", { ascending: false })
    .limit(1)
    .maybeSingle();
  const score = profile
    ? await computeScore(
        supabase,
        profile.id,
        lastScore?.score ?? null,
        lastScore?.onda ?? null,
      )
    : null;
  const identity = profile
    ? await computeIdentity(supabase, profile.id)
    : null;

  // Il nuotatore NON vede il proprio indice di readiness (ADR-006 §4).
  // Vede solo l'Effetto Acqua (>= 20 sessioni).
  const { data } = await supabase
    .from("v_effetto_acqua")
    .select("*")
    .eq("swimmer_id", profile?.id ?? "")
    .maybeSingle();
  const effetto = (data ?? null) as EffettoAcquaRow | null;

  const { data: effData } = await supabase
    .from("v_efficiency_points")
    .select("main_set_sig, rpe, created_at")
    .eq("swimmer_id", profile?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(200);
  const effPoints = (effData ?? []) as EffPoint[];

  // Sprint C.5 (TASK 5) — "Distribuzione carico": legge workout_completions.
  // blocks (Svolto, TASK 4), non workouts.blocks (Assegnato).
  const { data: compData } = await supabase
    .from("workout_completions")
    .select("id, week_start, blocks")
    .eq("swimmer_id", profile?.id ?? "")
    .order("week_start", { ascending: true });
  const completions = (compData ?? []) as WorkoutForStats[];
  const distribuzioneTotale = completions.reduce<Partial<Record<ZonaBucket, number>>>(
    (acc, c) => {
      for (const [z, v] of Object.entries(distribuzioneWorkout(c.blocks ?? [])))
        acc[z as ZonaBucket] = (acc[z as ZonaBucket] ?? 0) + (v ?? 0);
      return acc;
    },
    {},
  );
  const fetteCarico = toFette(distribuzioneTotale);
  const settimaneCarico = buildSettimane(completions);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="t-h2 text-foreground">Progressi</h1>
        <p className="t-small text-muted">
          La prova che questa cosa funziona — onda dopo onda.
        </p>
      </header>
      {!libero && <IdentityCard identity={identity} />}
      {score && <OndaCard onda={score.onda} />}
      {score && !libero && <GlideScoreCard result={score} />}
      <SwimmerProgress effetto={effetto} />
      <EfficiencyCurves points={effPoints} />

      {completions.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Distribuzione carico</h2>
          <Card className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
            <Torta fette={fetteCarico} />
            <div className="w-full sm:flex-1">
              <CurvaCarico settimane={settimaneCarico} />
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
