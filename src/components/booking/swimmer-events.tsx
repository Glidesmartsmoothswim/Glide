"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Pill } from "@/components/ui/card";

type OfferedTest = { id: string; name: string; duration: number };
type Slot = { warmup: string; test: string; out: string; lane: number };
type Ev = {
  id: string;
  title: string;
  kind: string;
  format: string;
  starts_at: string;
  location: string | null;
  offeredTests: OfferedTest[];
  myStatus: string | null;
  myTests: string[];
  slot: Slot | null;
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
const hm = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export function SwimmerEvents({ events }: { events: Ev[] }) {
  if (events.length === 0) return null;
  return (
    <Card>
      <h2 className="t-h3 mb-2">Eventi</h2>
      <ul className="flex flex-col gap-3">
        {events.map((e) =>
          e.format === "videoanalisi" ? (
            <VideoanalisiRow key={e.id} ev={e} />
          ) : (
            <SimpleRow key={e.id} ev={e} />
          ),
        )}
      </ul>
    </Card>
  );
}

function SimpleRow({ ev }: { ev: Ev }) {
  const router = useRouter();
  const [status, setStatus] = useState(ev.myStatus);
  const [busy, setBusy] = useState(false);
  const joined = status === "in" || status === "attended";

  async function join() {
    setBusy(true);
    const r = await fetch("/api/events/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventId: ev.id }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) {
      setStatus(j.status);
      router.refresh();
    }
  }

  return (
    <li className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2">
        <p className="flex-1 font-semibold">{ev.title}</p>
        <Pill tone="neutral">{ev.kind.replace(/_/g, " ")}</Pill>
      </div>
      <p className="t-small capitalize text-muted">
        {dt(ev.starts_at)}
        {ev.location ? ` · ${ev.location}` : ""}
      </p>
      <div className="mt-2">
        {joined ? (
          <Pill tone="ok">Ci sei</Pill>
        ) : status === "waitlist" ? (
          <Pill tone="warn">In lista d&apos;attesa</Pill>
        ) : (
          <button
            onClick={join}
            disabled={busy}
            className="rounded-lg bg-blu px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Ci sono
          </button>
        )}
      </div>
    </li>
  );
}

function VideoanalisiRow({ ev }: { ev: Ev }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set(ev.myTests));
  const [status, setStatus] = useState(ev.myStatus);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSel((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const packageMin = ev.offeredTests
    .filter((t) => sel.has(t.id))
    .reduce((a, t) => a + t.duration, 0);

  async function submit() {
    if (sel.size === 0) {
      setMsg("Scegli almeno un test.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/events/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ eventId: ev.id, tests: [...sel] }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) {
      setStatus(j.status);
      setMsg(
        j.status === "waitlist"
          ? "Sei in lista d'attesa. Ti avviso se si libera un posto."
          : "Iscrizione registrata. Il coach farà la scaletta.",
      );
      router.refresh();
    } else {
      setMsg(j.error ?? "Non è stato possibile iscriverti.");
    }
  }

  // Scaletta pubblicata → mostra SOLO il suo orario.
  if (ev.slot) {
    return (
      <li className="rounded-xl border border-blu/40 bg-blu/5 p-3">
        <p className="font-semibold">Il tuo orario · {ev.title}</p>
        <div className="mt-1 flex flex-col gap-0.5 t-small">
          <span>🔵 <b>{hm(ev.slot.warmup)}</b> — entra a scaldare</span>
          <span>🟢 <b>{hm(ev.slot.test)}</b> — in acqua, corsia {ev.slot.lane}</span>
          <span>⚪ <b>{hm(ev.slot.out)}</b> — fine</span>
        </div>
        <p className="t-small mt-1 text-muted">
          Presentati 15 minuti prima. Porta pinne e palette.
        </p>
        <a
          href={`/api/events/ics?event=${ev.id}`}
          className="mt-2 inline-block rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface"
        >
          Aggiungi al calendario
        </a>
      </li>
    );
  }

  const joined = status === "in" || status === "attended" || status === "waitlist";

  return (
    <li className="rounded-xl border border-border bg-background p-3">
      <div className="flex items-center gap-2">
        <p className="flex-1 font-semibold">{ev.title}</p>
        <Pill tone="neutral">videoanalisi</Pill>
      </div>
      <p className="t-small capitalize text-muted">
        {dt(ev.starts_at)}
        {ev.location ? ` · ${ev.location}` : ""}
      </p>
      <p className="t-small mt-2 text-muted">Scegli cosa vuoi analizzare:</p>
      <div className="mt-1 flex flex-col gap-1">
        {ev.offeredTests.map((t) => (
          <label
            key={t.id}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              sel.has(t.id) ? "border-blu bg-blu/10" : "border-border"
            }`}
          >
            <input
              type="checkbox"
              checked={sel.has(t.id)}
              onChange={() => toggle(t.id)}
            />
            <span className="flex-1">{t.name}</span>
            <span className="t-small text-muted">{t.duration}′</span>
          </label>
        ))}
      </div>
      <p className="t-small mt-2 font-semibold">
        Il tuo pacchetto: {packageMin} minuti in acqua.
      </p>
      {status === "waitlist" && <Pill tone="warn">In lista d&apos;attesa</Pill>}
      {msg && <p className="t-small mt-1 text-blu">{msg}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="mt-2 rounded-lg bg-blu px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {joined ? "Aggiorna iscrizione" : "Iscriviti"}
      </button>
    </li>
  );
}
