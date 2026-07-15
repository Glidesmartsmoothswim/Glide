"use client";

import { useState } from "react";
import { Card, Pill } from "@/components/ui/card";

type Ev = {
  id: string;
  title: string;
  kind: string;
  starts_at: string;
  location: string | null;
  mode: string;
  capacity: number | null;
};

const dt = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export function SwimmerEvents({
  events,
  signups,
}: {
  events: Ev[];
  signups: Record<string, string>;
}) {
  const [state, setState] = useState<Record<string, string>>(signups);
  const [busy, setBusy] = useState<string | null>(null);

  async function join(id: string) {
    setBusy(id);
    const r = await fetch("/api/events/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventId: id }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (r.ok) setState((p) => ({ ...p, [id]: j.status }));
  }

  if (events.length === 0) return null;

  return (
    <Card>
      <h2 className="t-h3 mb-2">Eventi</h2>
      <ul className="flex flex-col gap-3">
        {events.map((e) => {
          const st = state[e.id];
          const joined = st === "in" || st === "attended";
          return (
            <li key={e.id} className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-center gap-2">
                <p className="flex-1 font-semibold">{e.title}</p>
                <Pill tone="neutral">{e.kind.replace(/_/g, " ")}</Pill>
              </div>
              <p className="t-small capitalize text-muted">
                {dt(e.starts_at)}
                {e.location ? ` · ${e.location}` : ""}
              </p>
              <div className="mt-2">
                {joined ? (
                  <Pill tone="ok">Ci sei</Pill>
                ) : st === "waitlist" ? (
                  <Pill tone="warn">In lista d&apos;attesa</Pill>
                ) : (
                  <button
                    onClick={() => join(e.id)}
                    disabled={busy === e.id}
                    className="rounded-lg bg-blu px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    Ci sono
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
