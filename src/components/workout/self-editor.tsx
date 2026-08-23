"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Waves, Plus, Pencil, Trash2 } from "lucide-react";
import {
  createSelfWorkout,
  updateSelfWorkout,
  deleteSelfWorkout,
  type SelfWorkoutState,
} from "@/app/app/nuoto/self-actions";
import { BlockList } from "./workout-card";
import { parseLine, type Block } from "@/lib/workout";
import type { WorkoutRow } from "@/lib/types";

const field =
  "rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blu";

/** Anteprima live: stesso shorthand, nessuna riscrittura — solo i metri calcolati. */
function LinesPreview({ raw }: { raw: string }) {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return null;
  return (
    <ul className="flex flex-col gap-0.5 text-sm text-muted">
      {lines.map((l, i) => {
        const p = parseLine(l);
        return (
          <li key={i}>
            {l} · {p.reps * p.dist} m
          </li>
        );
      })}
    </ul>
  );
}

type Initial = { id: string; title: string; lines: string; pool: 25 | 50 };

/**
 * Editor SEMPLIFICATO del nuotatore (ADR-012, Onda 29.5) — NON l'editor
 * completo del coach (components/workout/editor.tsx): un blocco solo,
 * niente picker zone/attrezzi/più-blocchi. Riusa lo stesso shorthand e lo
 * stesso parseLine — la zona si scrive nella riga stessa (Z3/NM), come fa
 * il coach. Etichetta "Il tuo allenamento" sempre visibile: non deve mai
 * sembrare scritto da Alessio (ADR-001).
 */
function SelfForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: Initial;
  onDone: () => void;
  onCancel: () => void;
}) {
  const action = initial ? updateSelfWorkout : createSelfWorkout;
  const [state, formAction] = useActionState(action, {} as SelfWorkoutState);
  const [lines, setLines] = useState(initial?.lines ?? "");

  useEffect(() => {
    if (state.info) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.info]);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-turchese/50 bg-surface p-4"
    >
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <span className="t-label inline-flex w-fit items-center gap-1.5 text-blu">
        <Waves size={13} /> Il tuo allenamento
      </span>
      <input
        name="title"
        required
        defaultValue={initial?.title}
        placeholder="Titolo (es. Rifinitura prima della gara)"
        className={field}
      />
      <label className="flex flex-col gap-1 text-sm text-muted">
        Righe (stessa notazione del coach — una per riga)
        <textarea
          name="lines"
          required
          rows={5}
          value={lines}
          onChange={(e) => setLines(e.target.value)}
          placeholder={'8x50 SL @1\'20" Z3\n4x100 misti Z2'}
          className={`${field} font-mono`}
        />
      </label>
      <LinesPreview raw={lines} />
      <label className="flex flex-col gap-1 text-sm text-muted">
        Vasca
        <select name="pool" defaultValue={initial?.pool ?? 25} className={field}>
          <option value={25}>25 m</option>
          <option value={50}>50 m</option>
        </select>
      </label>
      {state.error && <p className="text-sm text-[#DC2626]">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-2.5 text-sm font-bold text-white"
        >
          Salva
        </button>
        <button type="button" onClick={onCancel} className="text-sm text-muted">
          Annulla
        </button>
      </div>
    </form>
  );
}

function SelfWorkoutView({
  w,
  onEdit,
}: {
  w: WorkoutRow;
  onEdit: () => void;
}) {
  const [pending, start] = useTransition();
  const blocks = Array.isArray(w.blocks) ? w.blocks : [];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-turchese/50 bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="t-label inline-flex items-center gap-1.5 text-blu">
            <Waves size={13} /> Il tuo allenamento
          </span>
          <h3 className="mt-1 font-display text-lg text-foreground">{w.title}</h3>
        </div>
        <span className="shrink-0 text-sm text-muted">
          {(w.total_meters ?? 0).toLocaleString("it-IT")} m · {w.pool ?? 25} m
        </span>
      </div>
      <BlockList blocks={blocks as Block[]} />
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-blu"
        >
          <Pencil size={14} /> Modifica
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Eliminare questo allenamento?"))
              start(() => deleteSelfWorkout(w.id));
          }}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-[#DC2626] disabled:opacity-50"
        >
          <Trash2 size={14} /> Elimina
        </button>
      </div>
    </div>
  );
}

function toInitial(w: WorkoutRow): Initial {
  const block = (Array.isArray(w.blocks) ? w.blocks[0] : null) as Block | null;
  return {
    id: w.id,
    title: w.title,
    lines: (block?.lines ?? []).join("\n"),
    pool: (w.pool as 25 | 50) ?? 25,
  };
}

/**
 * Sezione "Il tuo allenamento" su /app/nuoto — solo tier open/open_plus
 * (my_tier(), lib/access.ts "open:self"). Elenco dei self-workout del
 * nuotatore + crea/modifica/elimina. Nessun blocco compare qui: la lista è
 * già filtrata a kind='self' AND swimmer_id proprio dal chiamante (RLS lo
 * garantisce comunque — migration_037).
 */
export function SelfWorkoutManager({ items }: { items: WorkoutRow[] }) {
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      {items.map((w) =>
        editingId === w.id ? (
          <SelfForm
            key={w.id}
            initial={toInitial(w)}
            onDone={() => setEditingId(null)}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <SelfWorkoutView key={w.id} w={w} onEdit={() => setEditingId(w.id)} />
        ),
      )}

      {creating ? (
        <SelfForm
          onDone={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-turchese/50 py-3 text-sm font-bold text-blu"
        >
          <Plus size={16} /> Scrivi il tuo allenamento
        </button>
      )}
    </div>
  );
}
