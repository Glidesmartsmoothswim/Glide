import { ReadinessChart, type Point } from "./chart";
import {
  readinessScore,
  shortDate,
  type ReadinessRow,
} from "@/lib/readiness";
import { Card } from "@/components/ui/card";

/**
 * Blocco progressi: prontezza (dai check-in pre) + RPE (dai post) + note recenti.
 * Server component: calcola i punti e passa al grafico client.
 */
export function ReadinessProgress({ rows }: { rows: ReadinessRow[] }) {
  const asc = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const scorePoints: Point[] = asc
    .filter((r) => r.phase === "pre")
    .map((r) => ({ label: shortDate(r.created_at), value: readinessScore(r) ?? 0 }))
    .slice(-12);

  const rpePoints: Point[] = asc
    .filter((r) => r.phase === "post" && r.rpe != null)
    .map((r) => ({ label: shortDate(r.created_at), value: r.rpe! }))
    .slice(-12);

  const recentNotes = [...rows]
    .filter((r) => r.phase === "post" && r.note)
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h3 className="mb-2 font-display text-base text-foreground">
          Prontezza (0–100)
        </h3>
        <ReadinessChart points={scorePoints} color="#00b3a0" max={100} />
      </Card>

      <Card>
        <h3 className="mb-2 font-display text-base text-foreground">
          Sforzo percepito (RPE)
        </h3>
        <ReadinessChart points={rpePoints} color="#0E5EAB" max={10} unit="/10" />
      </Card>

      {recentNotes.length > 0 && (
        <Card>
          <h3 className="mb-2 font-display text-base text-foreground">
            Ultime note
          </h3>
          <ul className="flex flex-col gap-2">
            {recentNotes.map((r) => (
              <li key={r.id} className="text-sm">
                <span className="text-muted">{shortDate(r.created_at)} · RPE {r.rpe}</span>
                <p className="text-foreground">{r.note}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
