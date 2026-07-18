"use client";

import { useState } from "react";
import { Copy, Lock, Pencil } from "lucide-react";
import { WorkoutCard } from "./workout-card";
import { WorkoutEditor } from "./editor";
import { canEditWorkout, WORKOUT_EDIT_WINDOW_DAYS } from "@/lib/config";
import {
  savePersonalWorkout,
  saveOpenWorkout,
  updateWorkout,
} from "@/app/coach/workout-actions";
import type { WorkoutRow } from "@/lib/types";

/**
 * Scheda allenamento lato coach con azioni:
 * - entro 14 giorni → "Modifica" (aggiorna il record esistente);
 * - oltre → sola lettura con lucchetto, ma sempre "Duplica come nuovo".
 */
export function CoachWorkoutCard({
  w,
  doneCount = 0,
}: {
  w: WorkoutRow;
  doneCount?: number;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "dup">("view");
  const editable = canEditWorkout(w.published_at, w.created_at);
  const ctx = w.kind === "open_channel" ? "open" : "personal";
  const insertAction = ctx === "open" ? saveOpenWorkout : savePersonalWorkout;
  const initial = {
    title: w.title,
    focus: w.focus,
    pool: w.pool ?? 25,
    week_day: w.week_day ?? "Lun",
    blocks: w.blocks,
  };

  return (
    <div className="flex flex-col gap-2">
      <WorkoutCard w={w} />

      {mode === "view" && (
        <div className="flex items-center justify-between px-1">
          {editable ? (
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="inline-flex items-center gap-1 text-sm font-semibold text-blu"
            >
              <Pencil size={14} /> Modifica
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Lock size={13} /> Non più modificabile (oltre{" "}
              {WORKOUT_EDIT_WINDOW_DAYS} giorni dalla pubblicazione)
            </span>
          )}
          <button
            type="button"
            onClick={() => setMode("dup")}
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
          >
            <Copy size={14} /> Duplica
          </button>
        </div>
      )}

      {mode === "edit" && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          {doneCount > 0 && (
            <p className="mb-3 rounded-lg bg-[#FFF7E6] px-3 py-2 text-sm text-navy">
              {doneCount} {doneCount === 1 ? "atleta l'ha" : "atleti l'hanno"}{" "}
              già svolto: la modifica non tocca le sessioni registrate.
            </p>
          )}
          <WorkoutEditor
            action={updateWorkout}
            context={ctx}
            swimmerId={w.swimmer_id ?? undefined}
            workoutId={w.id}
            initial={initial}
            submitLabel="Salva modifiche"
          />
          <button
            type="button"
            onClick={() => setMode("view")}
            className="mt-2 text-sm text-muted"
          >
            Annulla
          </button>
        </div>
      )}

      {mode === "dup" && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-3 text-sm text-muted">
            Duplica come nuovo allenamento.
          </p>
          <WorkoutEditor
            action={insertAction}
            context={ctx}
            swimmerId={w.swimmer_id ?? undefined}
            initial={{ ...initial, title: `${w.title} (copia)` }}
            submitLabel="Crea copia"
          />
          <button
            type="button"
            onClick={() => setMode("view")}
            className="mt-2 text-sm text-muted"
          >
            Chiudi
          </button>
        </div>
      )}
    </div>
  );
}
