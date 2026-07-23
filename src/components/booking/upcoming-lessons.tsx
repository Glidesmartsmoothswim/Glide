"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Pill } from "@/components/ui/card";

type Lesson = {
  id: string;
  service: string;
  starts_at: string;
  mode: string;
  payment: string;
  status?: string;
};

const fullLabel = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export function UpcomingLessons({ lessons }: { lessons: Lesson[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function cancel(id: string) {
    if (!confirm("Disdici questa lezione? È gratis fino a 24h prima.")) return;
    setBusy(id);
    setMsg(null);
    const r = await fetch("/api/booking/cancel", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bookingId: id }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (r.ok) {
      setMsg(j.refunded ? "Disdetta fatta, credito restituito." : "Disdetta fatta.");
      router.refresh();
    } else {
      setMsg(j.error ?? "Non è stato possibile disdire.");
    }
  }

  return (
    <Card>
      <h2 className="t-h3 mb-2">Le tue lezioni</h2>
      <ul className="flex flex-col gap-3">
        {lessons.map((l) => (
          <li key={l.id} className="rounded-xl border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <p className="flex-1 font-semibold">{l.service}</p>
              {l.status === "pending" && <Pill tone="warn">In attesa</Pill>}
              {l.mode === "remote" ? (
                <Pill tone="ok">Video</Pill>
              ) : (
                <Pill tone="brand">Vasca</Pill>
              )}
            </div>
            {l.status === "pending" && (
              <p className="t-small mt-0.5 text-muted">
                In attesa di conferma del coach.
              </p>
            )}
            <p className="t-small mt-0.5 capitalize text-ink">{fullLabel(l.starts_at)}</p>
            <p className="t-small text-muted">
              {l.mode === "remote"
                ? "Ci vediamo in video: analisi tecnica, gara e programmazione"
                : "Piscina di Livorno"}
            </p>
            <div className="mt-2 flex gap-2">
              <a
                href={`/api/booking/ics?booking=${l.id}`}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-surface"
              >
                Aggiungi al calendario
              </a>
              <button
                onClick={() => cancel(l.id)}
                disabled={busy === l.id}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-surface disabled:opacity-50"
              >
                Disdici
              </button>
            </div>
          </li>
        ))}
      </ul>
      {msg && <p className="t-small mt-2 text-blu">{msg}</p>}
      <p className="t-small mt-2 text-muted">Disdetta gratis fino a 24h prima.</p>
    </Card>
  );
}
