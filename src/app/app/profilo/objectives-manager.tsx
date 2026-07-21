"use client";

import { useActionState, useTransition } from "react";
import { Target, Check, Archive, Trash2, Plus } from "lucide-react";
import {
  addObjective,
  setObjectiveStatus,
  deleteObjective,
  type ObjectiveState,
} from "./objectives-actions";
import {
  OBJECTIVE_KINDS,
  OBJECTIVE_KIND_LABEL,
  OBJECTIVE_STATUS_LABEL,
  type ObjectiveRow,
} from "@/lib/objectives";

const field =
  "rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blu";

/** Gestione obiettivi dal Profilo atleta. Niente barre/percentuali. */
export function ObjectivesManager({ items }: { items: ObjectiveRow[] }) {
  const [state, action] = useActionState(addObjective, {} as ObjectiveState);
  const [pending, start] = useTransition();

  const active = items.filter((o) => o.status === "attivo");
  const done = items.filter((o) => o.status !== "attivo");

  return (
    <div className="flex flex-col gap-4">
      <form action={action} className="flex flex-col gap-2">
        <input
          name="title"
          required
          placeholder="Il tuo obiettivo (es. 100 SL sotto 1'10&quot;)"
          className={field}
        />
        <div className="flex gap-2">
          <select name="kind" defaultValue="gara" className={`${field} flex-1`}>
            {OBJECTIVE_KINDS.map((k) => (
              <option key={k} value={k}>
                {OBJECTIVE_KIND_LABEL[k]}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="target_date"
            className={field}
            aria-label="Data obiettivo (facoltativa)"
          />
        </div>
        {state.error && <p className="text-sm text-[#DC2626]">{state.error}</p>}
        {state.info && <p className="text-sm text-teal">{state.info}</p>}
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blu to-navy py-2.5 text-sm font-semibold text-white"
        >
          <Plus size={16} /> Aggiungi obiettivo
        </button>
      </form>

      {active.length > 0 && (
        <div className="flex flex-col gap-2">
          {active.map((o) => (
            <div
              key={o.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3"
            >
              <Target size={16} className="shrink-0 text-blu" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{o.title}</p>
                <p className="text-xs text-muted">
                  {OBJECTIVE_KIND_LABEL[o.kind]}
                  {o.target_date ? ` · entro ${o.target_date}` : ""}
                </p>
              </div>
              <button
                type="button"
                title="Raggiunto"
                disabled={pending}
                onClick={() => start(() => setObjectiveStatus(o.id, "raggiunto"))}
                className="text-muted hover:text-teal disabled:opacity-50"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                title="Archivia"
                disabled={pending}
                onClick={() => start(() => setObjectiveStatus(o.id, "archiviato"))}
                className="text-muted hover:text-foreground disabled:opacity-50"
              >
                <Archive size={15} />
              </button>
              <button
                type="button"
                title="Elimina"
                disabled={pending}
                onClick={() => start(() => deleteObjective(o.id))}
                className="text-muted hover:text-[#DC2626] disabled:opacity-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {done.map((o) => (
            <div
              key={o.id}
              className="flex items-center gap-2 rounded-lg px-1 text-sm text-muted"
            >
              {o.status === "raggiunto" ? (
                <Check size={14} className="text-teal" />
              ) : (
                <Archive size={14} />
              )}
              <span className="flex-1 line-through/none">{o.title}</span>
              <span className="text-xs">{OBJECTIVE_STATUS_LABEL[o.status]}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => start(() => setObjectiveStatus(o.id, "attivo"))}
                className="text-xs text-blu hover:underline disabled:opacity-50"
              >
                Riattiva
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
