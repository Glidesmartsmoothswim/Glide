import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { SwimmerProgress } from "@/components/readiness/progress";
import { EfficiencyCurves, type EffPoint } from "@/components/readiness/efficiency";
import { OndaCard, GlideScoreCard } from "@/components/score/score-cards";
import { computeScore } from "@/lib/score/compute";
import { BadgeShelf, type EarnedBadge } from "@/components/badges/badge-shelf";
import { IdentityCard } from "@/components/identity/identity-card";
import { computeIdentity } from "@/lib/identity/compute";
import type { EffettoAcquaRow } from "@/lib/readiness";

export const metadata = { title: "Progressi" };
export const dynamic = "force-dynamic";

export default async function SwimmerProgressi() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  // Percorso "libero": niente Glide Score né 6 profili (spec Intake §4).
  // Restano Onda, Effetto Acqua, curva pace@RPE, badge.
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

  // Badge guadagnati (RLS: il nuotatore vede solo i propri).
  const { data: sbData } = await supabase
    .from("swimmer_badges")
    .select("badge_code, note, awarded_by, badges(name, description, kind, sort)")
    .eq("swimmer_id", profile?.id ?? "");
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
      <BadgeShelf earned={earned} />
      <SwimmerProgress effetto={effetto} />
      <EfficiencyCurves points={effPoints} />
    </div>
  );
}
