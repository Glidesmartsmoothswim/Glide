"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { createPost, type PostState } from "./actions";
import { PILLARS, POST_TYPES, CHANNELS } from "@/lib/social";

const field =
  "rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blu";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-2.5 font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Salvo…" : "Aggiungi al planner"}
    </button>
  );
}

export function NewPost() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createPost, {} as PostState);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-2.5 font-semibold text-white"
      >
        <Plus size={18} /> Nuovo post
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground">Nuovo post</h2>
          <button onClick={() => setOpen(false)} className="text-muted">
            <X size={20} />
          </button>
        </div>
        <form action={action} className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            <select name="pillar" defaultValue="consigli" className={field}>
              {PILLARS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <select name="post_type" defaultValue="design" className={field}>
              {(Object.keys(POST_TYPES) as (keyof typeof POST_TYPES)[]).map(
                (k) => (
                  <option key={k} value={k}>
                    {POST_TYPES[k].label}
                  </option>
                ),
              )}
            </select>
            <select name="channel" defaultValue="instagram" className={field}>
              {CHANNELS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            name="caption"
            rows={3}
            placeholder="Caption…"
            className={field}
          />
          <label className="flex flex-col gap-1 text-xs text-muted">
            Programma (facoltativo)
            <input type="datetime-local" name="scheduled_at" className={field} />
          </label>
          {state.error && <p className="text-sm text-[#DC2626]">{state.error}</p>}
          {state.info && <p className="text-sm text-teal">{state.info}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-border px-4 py-2.5 text-muted"
            >
              Chiudi
            </button>
            <Submit />
          </div>
        </form>
      </div>
    </div>
  );
}
