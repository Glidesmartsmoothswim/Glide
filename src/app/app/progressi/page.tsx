import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { SwimmerProgress } from "@/components/readiness/progress";
import { EfficiencyCurves, type EffPoint } from "@/components/readiness/efficiency";
import type { EffettoAcquaRow } from "@/lib/readiness";

export const metadata = { title: "Progressi" };

export default async function SwimmerProgressi() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
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
      <SwimmerProgress effetto={effetto} />
      <EfficiencyCurves points={effPoints} />
    </div>
  );
}
