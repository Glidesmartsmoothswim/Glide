"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Plus, Trash2, Waves } from "lucide-react";
import {
  ZONES,
  woMeters,
  lineLabel,
  parseLine,
  type Block,
  type ZoneId,
} from "@/lib/workout";
import { WEEK_DAYS } from "@/lib/types";

export type WorkoutFormState = {
  error?: string;
  info?: string;
  workoutId?: string;
};

const ZONE_IDS = Object.keys(ZONES) as ZoneId[];

const emptyBlock = (): Block => ({
  z: "Z2",
  name: "",
  rounds: 1,
  lines: [""],
});

const defaultBlocks = (): Block[] => [
  { z: "Z1", name: "Riscaldamento", rounds: 1, lines: ["600 SL pinne Z1"] },
];

export type WorkoutInitial = {
  title?: string;
  focus?: string | null;
  pool?: number;
  week_day?: string;
  blocks?: Block[];
};

type EditorProps = {
  action: (
    prev: WorkoutFormState,
    formData: FormData,
  ) => Promise<WorkoutFormState>;
  context: "personal" | "open";
  swimmerId?: string;
  /** Se presente → modalità MODIFICA di un allenamento esistente. */
  workoutId?: string;
  initial?: WorkoutInitial;
  submitLabel?: string;
  /** Ancora/URL a cui rimanda il link "Vai alla scheda" dopo il salvataggio. */
  successHref?: string;
};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blu to-navy px-5 py-2.5 font-semibold text-white disabled:opacity-60"
    >
      <Waves size={18} />
      {pending ? "Salvo…" : label}
    </button>
  );
}

export function WorkoutEditor(props: EditorProps) {
  const isEdit = Boolean(props.workoutId);
  const [state, formAction] = useActionState(
    props.action,
    {} as WorkoutFormState,
  );

  // Reset DOPO un salvataggio riuscito (solo in inserimento): rimontiamo il
  // form cambiando `key`. Il cambio di key è deciso in fase di render
  // confrontando l'ultimo stato visto (pattern React, niente useEffect).
  const [formKey, setFormKey] = useState(0);
  const [seen, setSeen] = useState<WorkoutFormState>(state);
  if (state !== seen) {
    setSeen(state);
    if (state.info && !state.error && !isEdit) setFormKey((k) => k + 1);
  }

  return (
    <EditorForm key={formKey} {...props} state={state} formAction={formAction} />
  );
}

function EditorForm({
  context,
  swimmerId,
  workoutId,
  initial,
  submitLabel = "Salva allenamento",
  successHref,
  state,
  formAction,
}: EditorProps & {
  state: WorkoutFormState;
  formAction: (formData: FormData) => void;
}) {
  const [blocks, setBlocks] = useState<Block[]>(
    initial?.blocks?.length ? initial.blocks : defaultBlocks(),
  );

  const total = woMeters(blocks);
  const patch = (i: number, p: Partial<Block>) =>
    setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, ...p } : b)));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {swimmerId && <input type="hidden" name="swimmer_id" value={swimmerId} />}
      {workoutId && <input type="hidden" name="workout_id" value={workoutId} />}
      <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
      <input type="hidden" name="total_meters" value={total} />

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="title"
          required
          defaultValue={initial?.title ?? ""}
          placeholder="Titolo (es. Soglia progressiva)"
          className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
        />
        <input
          name="focus"
          defaultValue={initial?.focus ?? ""}
          placeholder="Focus (es. Z3 · Fartlek)"
          className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
        />
        <select
          name="pool"
          defaultValue={String(initial?.pool ?? 25)}
          className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
        >
          <option value="25">Vasca 25 m</option>
          <option value="50">Vasca 50 m</option>
        </select>
        {context === "open" && (
          <select
            name="week_day"
            defaultValue={initial?.week_day ?? "Lun"}
            className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
          >
            {WEEK_DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {blocks.map((b, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-surface p-4"
            style={{ borderLeft: `4px solid ${ZONES[b.z].color}` }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={b.z}
                onChange={(e) => patch(i, { z: e.target.value as ZoneId })}
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
              >
                {ZONE_IDS.map((z) => (
                  <option key={z} value={z}>
                    {z} · {ZONES[z].desc}
                  </option>
                ))}
              </select>
              <input
                value={b.name}
                onChange={(e) => patch(i, { name: e.target.value })}
                placeholder="Nome blocco"
                className="flex-1 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-blu"
              />
              <label className="flex items-center gap-1 text-sm text-muted">
                ×
                <input
                  type="number"
                  min={1}
                  value={b.rounds}
                  onChange={(e) =>
                    patch(i, { rounds: Math.max(1, +e.target.value || 1) })
                  }
                  className="w-14 rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
                />
              </label>
              {blocks.length > 1 && (
                <button
                  type="button"
                  onClick={() => setBlocks((bs) => bs.filter((_, j) => j !== i))}
                  className="text-muted hover:text-[#DC2626]"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <textarea
              value={b.lines.join("\n")}
              onChange={(e) => patch(i, { lines: e.target.value.split("\n") })}
              rows={Math.max(2, b.lines.length)}
              placeholder={'8x50 SL @1\'20" palette Z3'}
              className="mt-3 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-blu"
            />

            {/* anteprima parsing live */}
            <ul className="mt-2 flex flex-col gap-0.5">
              {b.lines
                .filter((l) => l.trim())
                .map((l, k) => {
                  const p = parseLine(l);
                  return (
                    <li key={k} className="text-xs text-muted">
                      <span
                        className="mr-1 inline-block rounded px-1 font-semibold"
                        style={{
                          background: ZONES[p.zone ?? b.z].tint,
                          color: ZONES[p.zone ?? b.z].text,
                        }}
                      >
                        {p.zone ?? b.z}
                      </span>
                      {lineLabel(l)} · {p.reps * p.dist} m
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setBlocks((bs) => [...bs, emptyBlock()])}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:border-blu"
        >
          <Plus size={16} /> Aggiungi blocco
        </button>
        <span className="text-sm font-semibold text-foreground">
          Totale: {total.toLocaleString("it-IT")} m
        </span>
      </div>

      {state.error && <p className="text-sm text-[#DC2626]">{state.error}</p>}
      {state.info && !state.error && (
        <p className="inline-flex items-center gap-2 text-sm text-teal">
          <CheckCircle2 size={16} /> {state.info}
          {successHref && (
            <Link href={successHref} className="underline">
              Vai alla scheda
            </Link>
          )}
        </p>
      )}

      <div className="flex justify-end">
        <Submit label={submitLabel} />
      </div>
    </form>
  );
}
