import { ZONES, lineLabel, parseLine, blockMeters } from "@/lib/workout";
import type { WorkoutRow } from "@/lib/types";
import { Card, Pill } from "@/components/ui/card";

/** Visualizza un allenamento salvato (blocchi a zone + metri). */
export function WorkoutCard({ w }: { w: WorkoutRow }) {
  const blocks = Array.isArray(w.blocks) ? w.blocks : [];
  const updated =
    Boolean(w.updated_at) &&
    Boolean(w.published_at) &&
    new Date(w.updated_at as string).getTime() -
      new Date(w.published_at as string).getTime() >
      60_000;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-foreground">{w.title}</h3>
          {w.focus && <p className="text-sm text-muted">{w.focus}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {updated && <Pill tone="brand">Aggiornato</Pill>}
          {w.week_day && <Pill tone="brand">{w.week_day}</Pill>}
          <span className="text-xs text-muted">
            {(w.total_meters ?? 0).toLocaleString("it-IT")} m · {w.pool ?? 25} m
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {blocks.map((b, i) => (
          <div
            key={i}
            className="rounded-xl bg-background p-3"
            style={{ borderLeft: `4px solid ${ZONES[b.z]?.color ?? "#ccc"}` }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                {b.rounds > 1 ? `${b.rounds}× ` : ""}
                {b.name || b.z}
              </span>
              <span className="text-xs text-muted">{blockMeters(b)} m</span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {b.lines
                .filter((l) => l.trim())
                .map((l, k) => {
                  const p = parseLine(l);
                  const z = p.zone ?? b.z;
                  return (
                    <li key={k} className="text-sm text-foreground/80">
                      <span
                        className="mr-1.5 inline-block rounded px-1 text-xs font-semibold"
                        style={{
                          background: ZONES[z]?.tint,
                          color: ZONES[z]?.text,
                        }}
                      >
                        {z}
                      </span>
                      {lineLabel(l)}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
