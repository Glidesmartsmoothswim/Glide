"use client";

import { useActionState, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  createVideoEvent,
  type VAState,
} from "@/app/coach/agenda/videoanalisi-actions";

type Test = {
  id: string;
  name: string;
  duration_min: number;
  stroke: string | null;
  distance_m: number | null;
};

export function VideoEventForm({ tests }: { tests: Test[] }) {
  const [state, action] = useActionState<VAState, FormData>(
    createVideoEvent,
    {},
  );
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [lanes, setLanes] = useState(1);
  const [setup, setSetup] = useState(5);
  const [ws, setWs] = useState("");
  const [we, setWe] = useState("");

  const toggle = (id: string) =>
    setSel((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // Pacchetto medio = media durata test selezionati + setup.
  const selTests = tests.filter((t) => sel.has(t.id));
  const avgTest =
    selTests.length > 0
      ? selTests.reduce((a, t) => a + t.duration_min, 0) / selTests.length
      : 0;
  const avgPackage = avgTest + setup;
  const windowMin =
    ws && we ? (new Date(we).getTime() - new Date(ws).getTime()) / 60_000 : 0;
  const estimate =
    windowMin > 0 && avgPackage > 0
      ? Math.floor((windowMin * lanes) / avgPackage)
      : 0;

  return (
    <Card>
      <h2 className="t-h3 mb-3">Nuovo evento videoanalisi</h2>
      <form action={action} className="flex flex-col gap-4">
        {/* Dove e quando */}
        <div>
          <p className="t-label mb-2 text-muted">Dove e quando</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="title" placeholder="Titolo (es. Videoanalisi autunno)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <input name="location" placeholder="Sede (es. Piscina di Grosseto)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <label className="flex flex-col gap-1 text-sm">
              <span className="t-label text-muted">Inizio lavori</span>
              <input type="datetime-local" name="window_start" value={ws} onChange={(e) => setWs(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="t-label text-muted">Fine lavori</span>
              <input type="datetime-local" name="window_end" value={we} onChange={(e) => setWe(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="t-label text-muted">Viaggio andata (min)</span>
              <input type="number" name="travel_before_min" defaultValue={0} className="rounded-lg border border-border bg-background px-2 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="t-label text-muted">Viaggio ritorno (min)</span>
              <input type="number" name="travel_after_min" defaultValue={0} className="rounded-lg border border-border bg-background px-2 py-2" />
            </label>
          </div>
        </div>

        {/* Come lavoro */}
        <div>
          <p className="t-label mb-2 text-muted">Come lavoro</p>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="t-label text-muted">Corsie</span>
              <select name="lanes" value={lanes} onChange={(e) => setLanes(Number(e.target.value))} className="rounded-lg border border-border bg-background px-2 py-2">
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="t-label text-muted">Setup (min)</span>
              <input type="number" name="setup_min" value={setup} onChange={(e) => setSetup(Number(e.target.value))} className="rounded-lg border border-border bg-background px-2 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="t-label text-muted">Anticipo warmup</span>
              <input type="number" name="warmup_lead_min" defaultValue={30} className="rounded-lg border border-border bg-background px-2 py-2" />
            </label>
          </div>
        </div>

        {/* Griglia test */}
        <div>
          <p className="t-label mb-2 text-muted">Griglia test</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {tests.map((t) => (
              <label
                key={t.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  sel.has(t.id) ? "border-blu bg-blu/10" : "border-border bg-background"
                }`}
              >
                <input type="checkbox" name="tests" value={t.id} checked={sel.has(t.id)} onChange={() => toggle(t.id)} />
                <span className="flex-1">{t.name}</span>
                <span className="t-small text-muted">{t.duration_min}′</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-background px-3 py-2">
          <span className="t-small text-muted">Capienza stimata:</span>
          <span className="t-data">{estimate || "—"}</span>
          <span className="t-small text-muted">
            nuotatori ({windowMin ? `${Math.round(windowMin)}′` : "?"} · {lanes} corsie · pacchetto medio {Math.round(avgPackage) || "?"}′)
          </span>
          <input
            type="number"
            name="capacity"
            defaultValue={estimate || undefined}
            key={estimate}
            placeholder="Capienza"
            className="ml-auto w-24 rounded-lg border border-border bg-surface px-2 py-1 text-sm"
          />
        </div>

        {state.error && <p className="t-small text-[#DC2626]">{state.error}</p>}
        {state.info && <p className="t-small text-blu">{state.info}</p>}
        <button className="self-start rounded-lg bg-blu px-4 py-2 text-sm font-semibold text-white">
          Crea evento
        </button>
      </form>
    </Card>
  );
}
