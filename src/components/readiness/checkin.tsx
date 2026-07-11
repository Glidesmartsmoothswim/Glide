"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { PRE_QUESTIONS } from "@/lib/readiness";
import { savePre, savePost, type ReadinessState } from "@/app/app/readiness-actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 w-full rounded-xl bg-gradient-to-br from-blu to-navy py-3 font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Invio…" : label}
    </button>
  );
}

/** Scala 1–N a bottoni; scrive il valore in un hidden input `name`. */
function Scale({ name, max = 5 }: { name: string; max?: number }) {
  const [v, setV] = useState(0);
  return (
    <>
      <input type="hidden" name={name} value={v} />
      <div className="flex gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setV(n)}
            className={`flex-1 rounded-lg border py-2 text-sm font-bold transition-colors ${
              v === n
                ? "border-blu bg-blu text-white"
                : "border-border bg-background text-foreground"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </>
  );
}

export function ReadinessCheckin() {
  const [tab, setTab] = useState<"pre" | "post">("pre");
  const [preState, preAction] = useActionState(savePre, {} as ReadinessState);
  const [postState, postAction] = useActionState(savePost, {} as ReadinessState);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex rounded-xl border border-border bg-background p-1 text-sm">
        {(
          [
            ["pre", "Pre-sessione"],
            ["post", "Post-sessione"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-lg py-2 font-semibold transition-colors ${
              tab === id ? "bg-navy text-white" : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "pre" ? (
        <form action={preAction} className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Valuta da 1 a 5. Serve al coach per calibrare il carico.
          </p>
          {PRE_QUESTIONS.map((q) => (
            <div key={q.key}>
              <div className="mb-1.5 text-sm font-semibold text-foreground">
                {q.emoji} {q.label}
              </div>
              <Scale name={q.key} max={5} />
            </div>
          ))}
          {preState.error && (
            <p className="text-sm text-[#DC2626]">{preState.error}</p>
          )}
          {preState.info && <p className="text-sm text-teal">{preState.info}</p>}
          <Submit label="Invia al coach" />
        </form>
      ) : (
        <form action={postAction} className="flex flex-col gap-3">
          <div>
            <div className="mb-1.5 text-sm font-semibold text-foreground">
              💪 Sforzo percepito (RPE 1–10)
            </div>
            <Scale name="rpe" max={10} />
          </div>
          <textarea
            name="note"
            rows={3}
            placeholder="Com'è andata? (facoltativo)"
            className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blu"
          />
          {postState.error && (
            <p className="text-sm text-[#DC2626]">{postState.error}</p>
          )}
          {postState.info && (
            <p className="text-sm text-teal">{postState.info}</p>
          )}
          <Submit label="Registra sessione" />
        </form>
      )}
    </div>
  );
}
