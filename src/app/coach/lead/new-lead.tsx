"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import { createLead, type LeadState } from "./actions";
import { LEAD_SOURCES, SOURCE_LABEL } from "@/lib/leads";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-gradient-to-br from-blu to-navy px-5 py-2.5 font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Salvo…" : "Aggiungi lead"}
    </button>
  );
}

export function NewLead() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createLead, {} as LeadState);

  // Chiudi il form a inserimento riuscito (setState in render, niente effetto).
  const [seen, setSeen] = useState<LeadState>(state);
  if (state !== seen) {
    setSeen(state);
    if (state.info && !state.error) setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-2.5 text-sm font-semibold text-white"
      >
        <Plus size={16} /> Nuovo lead
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-foreground">Nuovo lead</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Chiudi"
          className="text-muted hover:text-foreground"
        >
          <X size={18} />
        </button>
      </div>

      <input
        name="name"
        required
        placeholder="Nome *"
        className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="phone"
          type="tel"
          placeholder="Telefono"
          className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
        />
      </div>
      <select
        name="source"
        defaultValue="instagram"
        className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
      >
        {LEAD_SOURCES.map((s) => (
          <option key={s} value={s}>
            Da: {SOURCE_LABEL[s]}
          </option>
        ))}
      </select>
      <textarea
        name="note"
        rows={2}
        placeholder="Nota (facoltativa)"
        className="resize-y rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
      />

      {state.error && <p className="text-sm text-[#DC2626]">{state.error}</p>}

      <div className="flex justify-end">
        <Submit />
      </div>
    </form>
  );
}
