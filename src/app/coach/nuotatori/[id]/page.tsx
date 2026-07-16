import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Card, Pill } from "@/components/ui/card";
import { WorkoutEditor } from "@/components/workout/editor";
import { WorkoutCard } from "@/components/workout/workout-card";
import { ReadinessProgress } from "@/components/readiness/progress";
import { EfficiencyCurves, type EffPoint } from "@/components/readiness/efficiency";
import { OndaCard, GlideScoreCard } from "@/components/score/score-cards";
import { computeScore } from "@/lib/score/compute";
import { BadgeShelf, type EarnedBadge } from "@/components/badges/badge-shelf";
import { ConferBadges } from "@/components/badges/confer-badges";
import type { VReadinessRow } from "@/lib/readiness";
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
    .select("score")
    .eq("swimmer_id", id)
    .order("week", { ascending: false })
    .limit(1)
    .maybeSingle();
  const score = await computeScore(supabase, id, lastScore?.score ?? null);

  // Badge: guadagnati + catalogo dei conferibili.
  const [{ data: sbData }, { data: catData }] = await Promise.all([
    supabase
      .from("swimmer_badges")
      .select("badge_code, note, badges(name, emoji, description, kind, sort)")
      .eq("swimmer_id", id),
    supabase
      .from("badges")
      .select("code, name, emoji, description")
      .eq("kind", "conferred")
      .order("sort"),
  ]);
  const earned: EarnedBadge[] = (sbData ?? [])
    .map((r) => {
      const b = r.badges as unknown as {
        name: string;
        emoji: string | null;
        description: string;
        kind: string;
        sort: number;
      } | null;
      return {
        code: r.badge_code as string,
        name: b?.name ?? r.badge_code,
        emoji: b?.emoji ?? null,
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

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">Progressi</h2>
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
            emoji: string | null;
            description: string;
          }[]}
          earnedCodes={earned.map((b) => b.code)}
        />
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
          />
        </Card>
      </section>

      {workouts.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">
            Schede ({workouts.length})
          </h2>
          {workouts.map((w) => (
            <WorkoutCard key={w.id} w={w} />
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
