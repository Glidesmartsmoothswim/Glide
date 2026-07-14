import { ReadinessChart, type Point } from "./chart";
import { sigLabel } from "@/lib/workout";
import { shortDate } from "@/lib/readiness";
import { Card } from "@/components/ui/card";

export type EffPoint = {
  main_set_sig: string;
  rpe: number;
  created_at: string;
};

/**
 * Curva di efficienza (GLIDE_QUESTIONARIO §5): RPE a PARITÀ di set principale.
 * Già filtrata a monte (v_efficiency_points: readiness_fisica >= 3.5).
 * Si mostra un set solo con >= 6 punti in 8 settimane. Sotto: niente.
 * Mai la parola "peggioramento"; se sale, non si commenta.
 */
export function EfficiencyCurves({ points }: { points: EffPoint[] }) {
  // La finestra di 8 settimane è filtrata a monte, nella query (.gte).
  const groups = new Map<string, EffPoint[]>();
  for (const p of points) {
    if (!p.main_set_sig || p.rpe == null) continue;
    const arr = groups.get(p.main_set_sig);
    if (arr) arr.push(p);
    else groups.set(p.main_set_sig, [p]);
  }

  const qualifying = [...groups.entries()].filter(([, ps]) => ps.length >= 6);
  if (qualifying.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {qualifying.map(([sig, ps]) => {
        const data: Point[] = [...ps]
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((p) => ({ label: shortDate(p.created_at), value: p.rpe }));
        return (
          <Card key={sig}>
            <h3 className="t-label mb-2 text-muted">
              Sforzo a parità di set · {sigLabel(sig)}
            </h3>
            <ReadinessChart points={data} color="#0E5EAB" max={10} unit="/10" />
            <p className="mt-2 t-small text-muted">
              Stesso passo prescritto: se l&apos;RPE scende, stessa velocità con
              meno fatica.
            </p>
          </Card>
        );
      })}
    </div>
  );
}
