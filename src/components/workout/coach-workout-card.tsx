"use client";
// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { useState, useTransition } from "react";
import { Copy, EyeOff, Lock, Pencil } from "lucide-react";
import { WorkoutCard } from "./workout-card";
import { WorkoutEditor, type WorkoutInitial } from "./editor";
import { canEditWorkout, WORKOUT_EDIT_WINDOW_DAYS } from "@/lib/config";
import { duplicateWorkout, updateWorkout } from "@/app/coach/workout-actions";
import type { WorkoutRow } from "@/lib/types";

const asInitial = (w: WorkoutRow): WorkoutInitial => ({
  title: w.title,
  focus: w.focus,
  pool: w.pool ?? 25,
  week_start: w.week_start,
  blocks: w.blocks,
  total_meters: w.total_meters,
  scale_down: w.scale_down,
  scale_up: w.scale_up,
});

/**
 * Scheda allenamento lato coach con azioni:
 * - entro 14 giorni → "Modifica" (aggiorna il record esistente);
 * - oltre → sola lettura con lucchetto, ma sempre "Duplica".
 *
 * "Duplica" non apre un form precompilato da pubblicare al volo: scrive subito
 * una COPIA IN BOZZA (senza settimana e senza published_at) e apre l'editor su
 * quella. Prima si comportava come un nuovo inserimento, quindi "Crea copia"
 * pubblicava sull'istante nella settimana corrente — una copia ancora da
 * rivedere arrivava agli iscritti nel momento stesso in cui nasceva.
 */
export function CoachWorkoutCard({
  w,
  doneCount = 0,
}: {
  w: WorkoutRow;
  doneCount?: number;
}) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [copy, setCopy] = useState<WorkoutRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicating, startDuplicate] = useTransition();

  const isDraft = !w.published_at;
  const editable = canEditWorkout(w.published_at, w.created_at);
  const ctx = w.kind === "open_channel" ? "open" : "personal";

  const duplicate = () =>
    startDuplicate(async () => {
      const res = await duplicateWorkout(w.id);
      if (res.error || !res.copy) {
        setError(res.error ?? "Copia non riuscita.");
        return;
      }
      setError(null);
      setMode("view");
      setCopy(res.copy);
    });

  return (
    <div className="flex flex-col gap-2">
      <WorkoutCard w={w} />

      {isDraft && mode === "view" && (
        <p className="mx-1 inline-flex items-center gap-1.5 rounded-lg bg-[#FFF7E6] px-3 py-2 text-sm text-navy">
          <EyeOff size={14} />
          Bozza: non la vede nessun iscritto.{" "}
          {ctx === "open"
            ? "Assegnale la settimana per pubblicarla."
            : "Pubblicala quando è pronta."}
        </p>
      )}

      {mode === "view" && (
        <div className="flex items-center justify-between px-1">
          {editable ? (
            <button
              type="button"
              onClick={() => setMode("edit")}
              className="inline-flex items-center gap-1 text-sm font-semibold text-blu"
            >
              <Pencil size={14} />{" "}
              {isDraft ? "Riprendi la bozza" : "Modifica"}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Lock size={13} /> Non più modificabile (oltre{" "}
              {WORKOUT_EDIT_WINDOW_DAYS} giorni dalla pubblicazione)
            </span>
          )}
          <button
            type="button"
            onClick={duplicate}
            disabled={duplicating}
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground disabled:opacity-60"
          >
            <Copy size={14} /> {duplicating ? "Duplico…" : "Duplica"}
          </button>
        </div>
      )}

      {error && <p className="px-1 text-sm text-[#DC2626]">{error}</p>}

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
            draft={isDraft}
            initial={asInitial(w)}
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

      {copy && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-[#FFF7E6] px-3 py-2 text-sm text-navy">
            <EyeOff size={14} />
            Copia creata in bozza, senza settimana: non la vede nessuno finché
            non sei tu a pubblicarla.
          </p>
          <WorkoutEditor
            action={updateWorkout}
            context={ctx}
            swimmerId={copy.swimmer_id ?? undefined}
            workoutId={copy.id}
            draft
            autoFocusTitle
            initial={asInitial(copy)}
            submitLabel="Salva bozza"
          />
          <button
            type="button"
            onClick={() => setCopy(null)}
            className="mt-2 text-sm text-muted"
          >
            Chiudi
          </button>
        </div>
      )}
    </div>
  );
}
