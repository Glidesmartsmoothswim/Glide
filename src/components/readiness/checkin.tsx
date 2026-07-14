"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  PRE_QUESTIONS,
  RPE_ANCHORS,
  MOOD_ANCHORS,
  PAIN_SITES,
  RED_FLAG_LABEL,
} from "@/lib/readiness";
import { savePre, savePost, type ReadinessState } from "@/app/app/readiness-actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 w-full rounded-xl bg-gradient-to-br from-blu to-navy py-3 font-bold text-white disabled:opacity-60"
    >
      {pending ? "Invio…" : label}
    </button>
  );
}

/** Scala 1..max con ancore SEMPRE visibili agli estremi + etichetta del valore. */
function Scale({
  name,
  anchors,
  max = 5,
  value,
  onChange,
}: {
  name: string;
  anchors: Record<number, string>;
  max?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <input type="hidden" name={name} value={value || ""} />
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 rounded-lg border py-2.5 text-base font-bold transition-colors ${
              value === n
                ? "border-blu bg-blu text-white"
                : "border-border bg-background text-foreground"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[13px] text-muted">
        <span>{anchors[1]}</span>
        <span>{anchors[max]}</span>
      </div>
      {value > 0 && anchors[value] && (
        <p className="mt-0.5 t-small font-bold text-foreground">
          {value} · {anchors[value]}
        </p>
      )}
    </div>
  );
}

const anchorsFromArray = (a: readonly string[]): Record<number, string> =>
  Object.fromEntries(a.map((s, i) => [i + 1, s]));

function PreForm() {
  const [state, action] = useActionState(savePre, {} as ReadinessState);
  const [vals, setVals] = useState<Record<string, number>>({});
  const [pains, setPains] = useState<string[]>([]);
  const [red, setRed] = useState(false);
  const set = (k: string, v: number) => setVals((s) => ({ ...s, [k]: v }));
  const togglePain = (p: string) =>
    setPains((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  const corpo = vals["corpo"] ?? 0;

  if (state.redFlag) {
    return (
      <div className="rounded-xl border-2 border-turchese bg-background p-4">
        <p className="t-body font-bold text-foreground">{state.info}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="pain_sites" value={pains.join(",")} />
      <input type="hidden" name="red_flag" value={red ? "true" : ""} />
      <p className="t-small text-muted">
        Da 1 a 5. Non ci sono risposte giuste: la verità, com&apos;è oggi.
      </p>

      {PRE_QUESTIONS.map((q) => (
        <div key={q.key}>
          <div className="mb-1.5 t-body font-bold text-foreground">{q.label}</div>
          <Scale
            name={q.key}
            anchors={anchorsFromArray(q.anchors)}
            value={vals[q.key] ?? 0}
            onChange={(v) => set(q.key, v)}
          />
          {q.key === "corpo" && corpo > 0 && corpo <= 3 && (
            <div className="mt-2 rounded-xl border border-border bg-background p-3">
              <div className="t-label mb-2 text-muted">Dove? (obbligatorio)</div>
              <div className="flex flex-wrap gap-2">
                {PAIN_SITES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePain(p)}
                    className={`rounded-full border px-3 py-1.5 t-small font-bold ${
                      pains.includes(p)
                        ? "border-blu bg-blu text-white"
                        : "border-border text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRed((r) => !r)}
        className={`rounded-xl border-2 px-3 py-2.5 t-body font-bold ${
          red ? "border-turchese bg-turchese/10 text-foreground" : "border-border text-muted"
        }`}
      >
        {RED_FLAG_LABEL}
      </button>

      {state.error && <p className="t-small font-bold text-[#B45309]">{state.error}</p>}
      <Submit label="Invia al coach" />
    </form>
  );
}

function PostForm({ workouts }: { workouts: WorkoutOpt[] }) {
  const [state, action] = useActionState(savePost, {} as ReadinessState);
  const [rpe, setRpe] = useState(0);
  const [umore, setUmore] = useState(0);
  return (
    <form action={action} className="flex flex-col gap-4">
      {workouts.length > 0 && (
        <div>
          <div className="mb-1.5 t-body font-bold text-foreground">
            Quale allenamento hai fatto?
          </div>
          <select
            name="workout_id"
            defaultValue=""
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 t-body outline-none focus:border-blu"
          >
            <option value="">— non lo dico —</option>
            {workouts.map((w) => (
              <option key={w.id} value={w.id}>
                {w.kind === "open_channel" ? "Open" : "Scheda"}
                {w.week_day ? ` ${w.week_day}` : ""} · {w.title}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <div className="mb-1.5 t-body font-bold text-foreground">
          Quanto è stata dura?
        </div>
        <Scale name="rpe" max={10} anchors={RPE_ANCHORS} value={rpe} onChange={setRpe} />
      </div>
      <div>
        <div className="mb-1.5 t-body font-bold text-foreground">
          E adesso, come stai?
        </div>
        <Scale
          name="umore_post"
          anchors={anchorsFromArray(MOOD_ANCHORS)}
          value={umore}
          onChange={setUmore}
        />
      </div>
      <textarea
        name="note"
        rows={3}
        placeholder="Una nota per Alessio (facoltativa)"
        className="rounded-xl border border-border bg-background px-3 py-2.5 t-body outline-none focus:border-blu"
      />
      {state.error && <p className="t-small font-bold text-[#B45309]">{state.error}</p>}
      {state.info && <p className="t-small text-foreground">{state.info}</p>}
      <Submit label="Registra sessione" />
    </form>
  );
}

export type WorkoutOpt = {
  id: string;
  title: string;
  week_day: string | null;
  kind: string;
};

export function ReadinessCheckin({ workouts }: { workouts: WorkoutOpt[] }) {
  const [tab, setTab] = useState<"pre" | "post">("pre");
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex rounded-xl border border-border bg-background p-1 t-small">
        {(
          [
            ["pre", "Pre-sessione"],
            ["post", "Post-sessione"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg py-2 font-bold transition-colors ${
              tab === id ? "bg-navy text-white" : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "pre" ? <PreForm /> : <PostForm workouts={workouts} />}
    </div>
  );
}
