"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, Pill } from "@/components/ui/card";
import { BlockList } from "./workout-card";
import { scaleBlocks, woMeters, type AdjustDirection } from "@/lib/workout";
import type { WorkoutRow } from "@/lib/types";
import { logWorkoutAdjustment } from "@/app/app/nuoto/adjust-actions";

const OPTIONS: { id: AdjustDirection; label: string }[] = [
  { id: "riduci", label: "Riduci un po'" },
  { id: "standard", label: "Come indicato" },
  { id: "aumenta", label: "Aumenta un po'" },
];

/**
 * Onda 27.3 — personalizzazione Canale Open: il nuotatore può scegliere di
 * ridurre o aumentare il VOLUME della seduta (mai zona/passo/intervallo, che
 * restano lo stimolo prescritto). Solo per gli allenamenti `open_channel`.
 * La scelta non modifica la scheda del coach: è solo la vista del nuotatore,
 * e viene loggata (fail-soft) per le statistiche di preferenza del coach.
 */
export function WorkoutAdjust({
  w,
  lastRpe,
}: {
  w: WorkoutRow;
  /** Ultimo RPE post-sessione del nuotatore (se c'è) → suggerimento non vincolante. */
  lastRpe: number | null;
}) {
  const [direction, setDirection] = useState<AdjustDirection>("standard");
  const [, startTransition] = useTransition();
  const scaled = useMemo(
    () => scaleBlocks(Array.isArray(w.blocks) ? w.blocks : [], direction),
    [w.blocks, direction],
  );
  const meters = useMemo(() => woMeters(scaled), [scaled]);

  const suggestion =
    lastRpe != null && lastRpe >= 8
      ? "Nell'ultima seduta hai segnalato uno sforzo alto. Se ti senti ancora stanco, valuta di ridurre."
      : lastRpe != null && lastRpe <= 3
        ? "Nell'ultima seduta era tutto facile: se ti senti carico, valuta di aumentare."
        : null;

  const choose = (d: AdjustDirection) => {
    setDirection(d);
    if (d !== "standard") {
      startTransition(() => {
        logWorkoutAdjustment(w.id, d);
      });
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-foreground">{w.title}</h3>
          {w.focus && <p className="text-sm text-muted">{w.focus}</p>}
        </div>
        <span className="shrink-0 text-xs text-muted">
          {meters.toLocaleString("it-IT")} m · {w.pool ?? 25} m
        </span>
      </div>

      {suggestion && (
        <p className="rounded-lg bg-[#FFF7E6] px-3 py-2 text-xs text-navy">
          {suggestion}
        </p>
      )}

      <div className="flex rounded-xl border border-border bg-background p-1 text-sm">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => choose(o.id)}
            className={`flex-1 rounded-lg py-2 font-semibold transition-colors ${
              direction === o.id ? "bg-navy text-white" : "text-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {direction !== "standard" && (
        <Pill tone="brand">
          {direction === "riduci" ? "−15% circa sul volume" : "+10% circa sul volume"}
        </Pill>
      )}

      <BlockList blocks={scaled} />
    </Card>
  );
}
