"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { UserPlus, X } from "lucide-react";
import { convertLead, type ConvertState } from "./actions";

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

export function ConvertLead({
  leadId,
  name,
  email,
}: {
  leadId: string;
  name: string;
  email: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(convertLead, {} as ConvertState);

  const parts = name.trim().split(/\s+/);
  const first0 = parts[0] ?? "";
  const last0 = parts.slice(1).join(" ");
  const done = Boolean(state.info) && !state.error;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:border-blu"
      >
        <UserPlus size={14} /> Converti in nuotatore
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-foreground">
            Converti in nuotatore
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted"
            aria-label="Chiudi"
          >
            <X size={20} />
          </button>
        </div>

        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="lead_id" value={leadId} />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="first_name"
              defaultValue={first0}
              placeholder="Nome"
              className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
            />
            <input
              name="last_name"
              defaultValue={last0}
              placeholder="Cognome"
              className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
            />
          </div>
          <input
            name="email"
            type="email"
            required
            defaultValue={email ?? ""}
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
          {done && (
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
              {done ? "Chiudi" : "Annulla"}
            </button>
            {!done && <Submit />}
          </div>
        </form>
      </div>
    </div>
  );
}
