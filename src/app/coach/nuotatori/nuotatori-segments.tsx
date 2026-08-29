"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { Avatar, Card, Pill } from "@/components/ui/card";

export type OneToOneRow = {
  id: string;
  initials: string;
  name: string;
  sub: string;
  tierLabel: string;
  statusLabel: string;
  statusTone: "ok" | "warn" | "neutral";
};

export type OpenRow = {
  id: string;
  name: string;
  statusLabel: string;
  statusTone: "ok" | "warn" | "neutral";
  paymentLabel: string;
  paymentTone: "ok" | "warn" | "bad";
  fisica: number | null;
  mentale: number | null;
  onda: number | null;
  aderenza: number | null;
  lastWorkout: string | null;
};

export type FreeRow = {
  id: string;
  name: string;
  nextBooking: string | null;
  tokenBalance: number;
  bookingCount: number;
  history: { label: string }[];
};

type Segment = "uno" | "open" | "free";

const SEGMENTS: { key: Segment; label: string; hint: string }[] = [
  { key: "uno", label: "1:1", hint: "Visione completa: chi segui da vicino." },
  { key: "open", label: "Open", hint: "Stato e pagamento a colpo d'occhio. Espandi solo chi ti scrive." },
  { key: "free", label: "Base gratuito", hint: "Solo prenotazioni: nessun dato di allenamento da monitorare." },
];

/**
 * Sprint B (ADR-014/015) — segment control a pillola, sfondo pieno (Ink) sul
 * segmento attivo (non un semplice cambio di colore testo), fedele a
 * GLIDE_mockup_nuotatori_segmenti.html.
 */
export function NuotatoriSegments({
  oneToOne,
  open,
  free,
}: {
  oneToOne: OneToOneRow[];
  open: OpenRow[];
  free: FreeRow[];
}) {
  const [seg, setSeg] = useState<Segment>("uno");
  const active = SEGMENTS.find((s) => s.key === seg)!;

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex w-fit gap-1 rounded-xl bg-surface p-1 shadow-sm">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSeg(s.key)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              seg === s.key ? "bg-ink text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {s.label}
            {s.key === "uno" && ` (${oneToOne.length})`}
            {s.key === "open" && ` (${open.length})`}
            {s.key === "free" && ` (${free.length})`}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-sm text-muted">{active.hint}</p>

      {seg === "uno" && <OneToOneList rows={oneToOne} />}
      {seg === "open" && <OpenTable rows={open} />}
      {seg === "free" && <FreeTable rows={free} />}
    </div>
  );
}

function OneToOneList({ rows }: { rows: OneToOneRow[] }) {
  if (rows.length === 0)
    return <Card className="text-muted">Nessun nuotatore 1:1 ancora.</Card>;
  return (
    <div className="flex flex-col gap-2">
      {rows.map((s) => (
        <Link key={s.id} href={`/coach/nuotatori/${s.id}`}>
          <Card className="flex items-center gap-3 transition-colors hover:border-blu">
            <Avatar text={s.initials} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-foreground">{s.name}</p>
              <p className="truncate text-sm text-muted">{s.sub}</p>
            </div>
            <Pill tone="brand">{s.tierLabel}</Pill>
            <Pill tone={s.statusTone}>{s.statusLabel}</Pill>
            <ChevronRight size={18} className="shrink-0 text-muted" />
          </Card>
        </Link>
      ))}
    </div>
  );
}

function OpenTable({ rows }: { rows: OpenRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (rows.length === 0)
    return <Card className="text-muted">Nessun nuotatore Open/Open+ ancora.</Card>;
  const dash = (v: number | null, suffix = "") => (v == null ? "—" : `${v}${suffix}`);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      {rows.map((s) => {
        const open = expanded === s.id;
        return (
          <div key={s.id} className="border-b border-border last:border-none">
            <button
              type="button"
              onClick={() => setExpanded(open ? null : s.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-background"
            >
              <span className="flex-1 truncate font-bold text-foreground">{s.name}</span>
              <Pill tone={s.statusTone}>{s.statusLabel}</Pill>
              <Pill tone={s.paymentTone}>{s.paymentLabel}</Pill>
              {open ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
            </button>
            {open && (
              <div className="flex flex-wrap gap-6 bg-background px-4 py-4 pl-12">
                <Stat label="Ultimo check-in (fis./ment.)" value={`${dash(s.fisica)} / ${dash(s.mentale)}`} />
                <Stat label="Onda score" value={dash(s.onda)} />
                <Stat label="Aderenza" value={dash(s.aderenza, "%")} />
                <Stat label="Ultimo allenamento" value={s.lastWorkout ?? "—"} />
                <Link
                  href={`/coach/nuotatori/${s.id}`}
                  className="ml-auto self-center text-sm font-bold text-blu"
                >
                  Apri scheda →
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FreeTable({ rows }: { rows: FreeRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  if (rows.length === 0)
    return <Card className="text-muted">Nessun nuotatore Base gratuito ancora.</Card>;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      {rows.map((s) => {
        const open = expanded === s.id;
        return (
          <div key={s.id} className="border-b border-border last:border-none">
            <button
              type="button"
              onClick={() => setExpanded(open ? null : s.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-background"
            >
              <span className="flex-1 truncate font-bold text-foreground">{s.name}</span>
              <span className="hidden text-sm text-muted sm:block">
                {s.nextBooking ? `Prossima: ${s.nextBooking}` : "Nessuna prenotazione futura"}
              </span>
              <Pill tone="brand">
                {s.tokenBalance > 0 ? `${s.tokenBalance} token` : `${s.bookingCount} prenotazioni`}
              </Pill>
              {open ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
            </button>
            {open && (
              <div className="flex flex-col gap-1 bg-background px-4 py-4 pl-12 text-sm text-muted">
                {s.history.length === 0 ? (
                  <span>Nessuna prenotazione ancora.</span>
                ) : (
                  s.history.map((h, i) => <div key={i}>{h.label}</div>)
                )}
                <Link href={`/coach/nuotatori/${s.id}`} className="mt-2 font-bold text-blu">
                  Apri scheda →
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <p className="font-bold text-foreground">{value}</p>
    </div>
  );
}
