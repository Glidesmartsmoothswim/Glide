"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { createSwimmer, type SwimmerActionState } from "./actions";

const initial: SwimmerActionState = {};

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-2.5 font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Creo…" : "Crea nuotatore"}
    </button>
  );
}

export function NewSwimmer() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createSwimmer, initial);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-2.5 font-semibold text-white"
      >
        <Plus size={18} /> Nuovo nuotatore
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground">
            Nuovo nuotatore
          </h2>
          <button onClick={() => setOpen(false)} className="text-muted">
            <X size={20} />
          </button>
        </div>

        <form action={action} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              name="first_name"
              placeholder="Nome"
              className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
            />
            <input
              name="last_name"
              placeholder="Cognome"
              className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
            />
          </div>
          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
          />
          <select
            name="service_type"
            defaultValue="open"
            className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
          >
            <option value="open">Open</option>
            <option value="coaching_1_1">1:1</option>
            <option value="both">1:1 + Open</option>
          </select>

          {state.error && (
            <p className="text-sm text-[#DC2626]">{state.error}</p>
          )}
          {state.info && (
            <div className="rounded-xl border border-teal/30 bg-teal/10 p-3 text-sm text-teal">
              {state.info}
              {state.tempPassword && (
                <p className="mt-1 font-mono text-foreground">
                  Password temporanea:{" "}
                  <span className="font-bold">{state.tempPassword}</span>
                </p>
              )}
            </div>
          )}

          <div className="mt-1 flex justify-end gap-2">
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
