"use client";

import { useState } from "react";
import Link from "next/link";
import { Waves, Check, ArrowRight } from "lucide-react";
import { ZONES, onColor, type ZoneId } from "@/lib/workout";

type HandWorkout = {
  id: string;
  title: string;
  focus: string | null;
  total_meters: number | null;
  pool: number | null;
  zone: ZoneId | null;
  done: boolean;
};

// Colore "seme" della carta = colore della ZONA di riferimento dell'allenamento.
// Se la zona non è riconoscibile, un navy sobrio (mai il turchese neon).
function suitColor(zone: ZoneId | null): string {
  return zone ? ZONES[zone].color : "#203979";
}

/**
 * Onda 18 — gli allenamenti della settimana come una "mano" di carte da gioco.
 * Le carte sono a ventaglio; tocchi quella che vuoi → si alza e la apri.
 * Nessuna numerazione imposta, nessun obbligo: scegli tu.
 */
export function WorkoutHand({ workouts }: { workouts: HandWorkout[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const n = workouts.length;
  const mid = (n - 1) / 2;
  // Ventaglio più stretto se ci sono tante carte.
  const stepDeg = n > 4 ? 9 : 13;
  const stepX = n > 4 ? 52 : 64;

  const selected = sel != null ? workouts[sel] : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative mx-auto"
        style={{ height: 210, width: `${112 + (n - 1) * stepX + 24}px`, maxWidth: "100%" }}
      >
        {workouts.map((w, i) => {
          const isSel = sel === i;
          const off = i - mid;
          const rot = isSel ? 0 : off * stepDeg;
          const tx = off * stepX;
          const ty = isSel ? -26 : Math.abs(off) * 10;
          const suit = suitColor(w.zone);
          const suitText = onColor(suit);
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => setSel(isSel ? null : i)}
              aria-label={`Allenamento ${w.title}`}
              className="absolute left-1/2 top-3 h-44 w-28 origin-bottom rounded-xl border border-border bg-surface shadow-md transition-transform duration-200"
              style={{
                transform: `translateX(calc(-50% + ${tx}px)) translateY(${ty}px) rotate(${rot}deg) ${isSel ? "scale(1.06)" : ""}`,
                zIndex: isSel ? 50 : 10 + i,
                opacity: sel != null && !isSel ? 0.55 : 1,
              }}
            >
              {/* testata "seme" = colore della zona di riferimento */}
              <div
                className="flex h-9 items-center justify-between rounded-t-xl px-2"
                style={{ background: suit, color: suitText }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {w.zone ?? (w.focus ? w.focus.slice(0, 10) : "Open")}
                </span>
                <Waves size={13} />
              </div>
              {/* corpo carta */}
              <div className="flex h-[calc(100%-2.25rem)] flex-col items-center justify-center gap-1 px-2 text-center">
                <span className="font-display text-lg leading-none text-foreground">
                  {(w.total_meters ?? 0).toLocaleString("it-IT")}
                </span>
                <span className="text-[10px] text-muted">m · {w.pool ?? 25}m</span>
                <span className="mt-1 line-clamp-2 text-[11px] font-semibold text-foreground">
                  {w.title}
                </span>
              </div>
              {w.done && (
                <span className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-teal text-white shadow">
                  <Check size={13} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected ? (
        <div className="flex w-full items-center gap-3 rounded-xl border border-blu/40 bg-surface p-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {selected.title}
            </p>
            <p className="text-xs text-muted">
              {selected.focus ? `${selected.focus} · ` : ""}
              {(selected.total_meters ?? 0).toLocaleString("it-IT")} m
              {selected.done ? " · già svolto" : ""}
            </p>
          </div>
          <Link
            href={`/app/nuoto/${selected.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-blu to-navy px-3 py-2 text-sm font-semibold text-white"
          >
            Apri <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <p className="text-xs text-muted">Tocca una carta per aprirla.</p>
      )}
    </div>
  );
}
