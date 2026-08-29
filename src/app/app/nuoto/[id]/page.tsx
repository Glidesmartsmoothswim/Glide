import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { WorkoutCard } from "@/components/workout/workout-card";
import { RequestChangeButton } from "@/components/workout/request-change";
import type { WorkoutRow } from "@/lib/types";
import type { VReadinessRow } from "@/lib/readiness";

export const metadata = { title: "Allenamento" };

/**
 * Dettaglio di un allenamento. L'accesso è governato dalla RLS di `workouts`
 * (Onda 12.1): settimana corrente per gli open, sempre per ciò che ho svolto,
 * le proprie schede personali. Se non accessibile → 404.
 */
export default async function WorkoutDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const { data } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const w = data as WorkoutRow;

  // TASK 8 (feedback 29/08): se questa seduta è già stata completata, la
  // riga 'post' in v_readiness (RLS: propria o coach) ha nota/RPE/umore —
  // oggi mancavano del tutto in questa vista. Una per workout nella pratica
  // (readiness-actions.ts inserisce solo al post-sessione), ma prendo la
  // più recente in caso di doppio invio.
  const { data: postRows } = profile
    ? await supabase
        .from("v_readiness")
        .select("*")
        .eq("workout_id", id)
        .eq("swimmer_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
    : { data: [] as VReadinessRow[] };
  const post = (postRows ?? [])[0] as VReadinessRow | undefined;

  // Il check-in "pre" (sonno/energia) è giornaliero, non legato a un
  // workout_id (readiness-actions.ts lo inserisce prima di scegliere cosa
  // nuotare) — qui recupero quello dello stesso giorno del post, il più
  // vicino prima di esso, come "readiness" di quella seduta.
  let pre: VReadinessRow | undefined;
  if (profile && post) {
    const day = post.created_at.slice(0, 10);
    const { data: preRows } = await supabase
      .from("v_readiness")
      .select("*")
      .eq("swimmer_id", profile.id)
      .not("sonno", "is", null)
      .gte("created_at", `${day}T00:00:00Z`)
      .lte("created_at", post.created_at)
      .order("created_at", { ascending: false })
      .limit(1);
    pre = (preRows ?? [])[0] as VReadinessRow | undefined;
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/app/nuoto"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} /> Nuoto
      </Link>
      <WorkoutCard w={w} />

      {post ? (
        <Card className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-teal">
            <CheckCircle2 size={18} />
            <p className="font-bold">Completata</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {post.rpe != null && (
              <div>
                <p className="text-muted">RPE</p>
                <p className="font-bold text-foreground">{post.rpe}/10</p>
              </div>
            )}
            {post.umore_post != null && (
              <div>
                <p className="text-muted">Umore dopo</p>
                <p className="font-bold text-foreground">{post.umore_post}/5</p>
              </div>
            )}
            {pre?.sonno != null && (
              <div>
                <p className="text-muted">Sonno (pre)</p>
                <p className="font-bold text-foreground">{pre.sonno}/5</p>
              </div>
            )}
            {pre?.energia != null && (
              <div>
                <p className="text-muted">Energia (pre)</p>
                <p className="font-bold text-foreground">{pre.energia}/5</p>
              </div>
            )}
          </div>
          {post.nota && (
            <div className="border-t border-border pt-2">
              <p className="text-muted">La tua nota</p>
              <p className="text-foreground">{post.nota}</p>
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* L'allenamento lo scrive Alessio (ADR-001): niente self-scaling,
              solo la richiesta. Non per le schede "self" (ADR-012): quelle
              le hai scritte tu, non c'è nessuno a cui chiedere di
              cambiarle — si modificano da /app/nuoto. */}
          {w.kind !== "self" && <RequestChangeButton workoutId={w.id} />}
          <p className="text-sm text-muted">
            Per registrare la sessione, apri il check-in dalla home (Oggi) e
            scegli questo allenamento.
          </p>
        </>
      )}
    </div>
  );
}
