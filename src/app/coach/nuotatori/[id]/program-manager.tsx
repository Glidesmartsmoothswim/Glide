"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  PHASE_TYPES,
  PHASE_LABEL,
  PHASE_COLOR,
  daysToRace,
  type ProgramRow,
  type PhaseRow,
  type PhaseType,
  type PhaseInput,
} from "@/lib/programs";
import {
  createProgram,
  savePhases,
  saveProgramNotes,
  activateProgram,
  closeProgram,
  duplicateProgram,
  deleteProgram,
} from "./program-actions";

type ProgramFull = ProgramRow & { phases: PhaseRow[]; notes: string | null };

const STATUS_LABEL: Record<string, string> = {
  draft: "Bozza",
  active: "Attivo",
  closed: "Chiuso",
};

export function ProgramManager({
  swimmerId,
  programs,
}: {
  swimmerId: string;
  programs: ProgramFull[];
}) {
  const [creating, setCreating] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      {programs.map((p) => (
        <ProgramCard key={p.id} swimmerId={swimmerId} program={p} />
      ))}

      {creating ? (
        <NewProgram swimmerId={swimmerId} onDone={() => setCreating(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:border-blu"
        >
          <Plus size={16} /> Nuovo programma
        </button>
      )}
    </div>
  );
}

function useAction() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string; info?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.error ?? r.info ?? null);
    });
  return { pending, msg, run, setMsg };
}

function ProgramCard({
  swimmerId,
  program,
}: {
  swimmerId: string;
  program: ProgramFull;
}) {
  const { pending, msg, run } = useAction();
  const days = daysToRace(program.goal_race_date);

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-foreground">{program.title}</h3>
          <p className="text-xs text-muted">
            {program.start_date} → {program.end_date}
            {program.goal_race_name ? ` · ${program.goal_race_name}` : ""}
            {days != null ? ` · gara tra ${days} gg` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            program.status === "active"
              ? "bg-navy text-white"
              : "border border-border text-muted"
          }`}
        >
          {STATUS_LABEL[program.status]}
        </span>
      </div>

      <PhaseBar phases={program.phases} />
      <PhaseEditor
        swimmerId={swimmerId}
        program={program}
        readOnly={program.status === "closed"}
      />

      <Notes
        programId={program.id}
        swimmerId={swimmerId}
        initial={program.notes ?? ""}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-sm">
        {program.status === "draft" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => activateProgram(program.id, swimmerId))}
            className="rounded-lg bg-navy px-3 py-1.5 font-semibold text-white"
          >
            Attiva
          </button>
        )}
        {program.status === "active" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => closeProgram(program.id, swimmerId))}
            className="rounded-lg border border-border px-3 py-1.5 font-semibold text-foreground hover:border-blu"
          >
            Chiudi programma
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => duplicateProgram(program.id, swimmerId))}
          className="rounded-lg border border-border px-3 py-1.5 text-muted hover:text-foreground"
        >
          Duplica
        </button>
        {program.status === "draft" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => deleteProgram(program.id, swimmerId))}
            className="ml-auto text-muted hover:text-[#DC2626]"
          >
            Elimina bozza
          </button>
        )}
        {msg && <span className="w-full text-xs text-muted">{msg}</span>}
      </div>
    </div>
  );
}

function PhaseBar({ phases }: { phases: PhaseRow[] }) {
  if (!phases.length) return null;
  return (
    <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full">
      {phases.map((p) => (
        <div
          key={p.id}
          title={`${PHASE_LABEL[p.phase_type]} · ${p.start_date}→${p.end_date}`}
          className="flex-1"
          style={{ background: PHASE_COLOR[p.phase_type] }}
        />
      ))}
    </div>
  );
}

function PhaseEditor({
  swimmerId,
  program,
  readOnly,
}: {
  swimmerId: string;
  program: ProgramFull;
  readOnly: boolean;
}) {
  const { pending, msg, run } = useAction();
  const [rows, setRows] = useState<PhaseInput[]>(
    program.phases.map((p) => ({
      name: p.name,
      phase_type: p.phase_type,
      start_date: p.start_date,
      end_date: p.end_date,
      focus: p.focus,
    })),
  );

  const patch = (i: number, v: Partial<PhaseInput>) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...v } : x)));

  if (readOnly)
    return (
      <ul className="mt-3 flex flex-col gap-1 text-sm text-muted">
        {program.phases.map((p) => (
          <li key={p.id}>
            {PHASE_LABEL[p.phase_type]} · {p.start_date}→{p.end_date}
            {p.focus ? ` · ${p.focus}` : ""}
          </li>
        ))}
      </ul>
    );

  return (
    <div className="mt-3 flex flex-col gap-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <input
            value={r.name}
            onChange={(e) => patch(i, { name: e.target.value })}
            placeholder="Nome"
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
          <select
            value={r.phase_type}
            onChange={(e) => patch(i, { phase_type: e.target.value as PhaseType })}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          >
            {PHASE_TYPES.map((t) => (
              <option key={t} value={t}>
                {PHASE_LABEL[t]}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={r.start_date}
            onChange={(e) => patch(i, { start_date: e.target.value })}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
          <input
            type="date"
            value={r.end_date}
            onChange={(e) => patch(i, { end_date: e.target.value })}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
          <div className="flex items-center gap-1">
            <input
              value={r.focus ?? ""}
              onChange={(e) => patch(i, { focus: e.target.value })}
              placeholder="Focus"
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
              className="text-muted hover:text-[#DC2626]"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() =>
            setRows((r) => [
              ...r,
              {
                name: "",
                phase_type: "generale",
                start_date: program.start_date,
                end_date: program.end_date,
                focus: "",
              },
            ])
          }
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <Plus size={15} /> Aggiungi fase
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => savePhases(program.id, swimmerId, rows))}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold text-foreground hover:border-blu"
        >
          Salva fasi
        </button>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>
    </div>
  );
}

function Notes({
  programId,
  swimmerId,
  initial,
}: {
  programId: string;
  swimmerId: string;
  initial: string;
}) {
  const { pending, msg, run } = useAction();
  const [notes, setNotes] = useState(initial);
  return (
    <div className="mt-3">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Note del coach (solo tu le vedi)"
        className="w-full resize-y rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => saveProgramNotes(programId, swimmerId, notes))}
        className="mt-1 text-xs font-semibold text-blu"
      >
        Salva note {msg ? `· ${msg}` : ""}
      </button>
    </div>
  );
}

function NewProgram({
  swimmerId,
  onDone,
}: {
  swimmerId: string;
  onDone: () => void;
}) {
  const { pending, msg, run } = useAction();
  const [f, setF] = useState({
    title: "",
    start_date: "",
    end_date: "",
    goal_race_name: "",
    goal_race_date: "",
    goal_race_pool: "",
    goal_time_target: "",
  });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <h3 className="font-display text-lg text-foreground">Nuovo programma</h3>
      <input
        value={f.title}
        onChange={(e) => set("title", e.target.value)}
        placeholder="Titolo (es. Preparazione Regionali 2027)"
        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">
          Inizio
          <input
            type="date"
            value={f.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-muted">
          Fine
          <input
            type="date"
            value={f.end_date}
            onChange={(e) => set("end_date", e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <input
        value={f.goal_race_name}
        onChange={(e) => set("goal_race_name", e.target.value)}
        placeholder="Gara obiettivo (facoltativa)"
        className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted">
          Data gara
          <input
            type="date"
            value={f.goal_race_date}
            onChange={(e) => set("goal_race_date", e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-muted">
          Tempo obiettivo (testo)
          <input
            value={f.goal_time_target}
            onChange={(e) => set("goal_time_target", e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <button type="button" onClick={onDone} className="text-sm text-muted">
          Annulla
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const r = await createProgram({
                swimmer_id: swimmerId,
                title: f.title,
                start_date: f.start_date,
                end_date: f.end_date,
                goal_race_name: f.goal_race_name || null,
                goal_race_date: f.goal_race_date || null,
                goal_race_pool: f.goal_race_pool ? Number(f.goal_race_pool) : null,
                goal_time_target: f.goal_time_target || null,
              });
              if (!r.error) onDone();
              return r;
            })
          }
          className="rounded-lg bg-gradient-to-br from-blu to-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Crea
        </button>
        {msg && <span className="text-xs text-muted">{msg}</span>}
      </div>
    </div>
  );
}
