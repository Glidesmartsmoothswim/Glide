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
 * Onda 18/20 — gli allenamenti della settimana come una "mano" di carte.
 * Le carte sono a ventaglio. Passa il dito (o il mouse) sopra le carte per
 * vederne l'ANTEPRIMA al volo — quella sotto il dito si alza e mostra i dati;
 * quando ti fermi resta selezionata e la apri. Nessun obbligo: scegli tu.
 */
export function WorkoutHand({ workouts }: { workouts: HandWorkout[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const n = workouts.length;
  const mid = (n - 1) / 2;
  // Ventaglio più stretto se ci sono tante carte.
  const stepDeg = n > 4 ? 9 : 13;
  const stepX = n > 4 ? 52 : 64;

  // La carta "attiva" è quella sotto il dito (anteprima); se non c'è, l'ultima
  // scelta. È lei a sollevarsi e a comparire nel riquadro sotto il ventaglio.
  const active = hover ?? sel;
  const shown = active != null ? workouts[active] : null;

  // Indice della carta sotto un punto dello schermo (per il passaggio del dito).
  const indexFromPoint = (x: number, y: number): number | null => {
    const el = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>("[data-card-index]");
    if (!el) return null;
    const idx = Number(el.dataset.cardIndex);
    return Number.isNaN(idx) ? null : idx;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    setHover(indexFromPoint(e.clientX, e.clientY));
  };
  const clearHover = () => setHover(null);
  const onPointerUp = (e: React.PointerEvent) => {
    const idx = indexFromPoint(e.clientX, e.clientY) ?? hover;
    if (idx != null) setSel(idx);
    // Su touch il dito si stacca: l'anteprima cede il passo alla selezione.
    if (e.pointerType !== "mouse") setHover(null);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative mx-auto"
        style={{
          height: 210,
          width: `${112 + (n - 1) * stepX + 24}px`,
          maxWidth: "100%",
          touchAction: "none",
        }}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={clearHover}
        onPointerCancel={clearHover}
      >
        {workouts.map((w, i) => {
          const isActive = active === i;
          const off = i - mid;
          const rot = isActive ? 0 : off * stepDeg;
          const tx = off * stepX;
          const ty = isActive ? -26 : Math.abs(off) * 10;
          const suit = suitColor(w.zone);
          const suitText = onColor(suit);
          return (
            <button
              key={w.id}
              type="button"
              data-card-index={i}
              onClick={() => setSel(i)}
              onFocus={() => setHover(i)}
              onBlur={clearHover}
              aria-label={`Allenamento ${w.title}`}
              className="absolute left-1/2 top-3 h-44 w-28 origin-bottom rounded-xl border border-border bg-surface shadow-md transition-transform duration-200"
              style={{
                transform: `translateX(calc(-50% + ${tx}px)) translateY(${ty}px) rotate(${rot}deg) ${isActive ? "scale(1.06)" : ""}`,
                zIndex: isActive ? 50 : 10 + i,
                opacity: active != null && !isActive ? 0.55 : 1,
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

      {shown ? (
        <div className="flex w-full items-center gap-3 rounded-xl border border-blu/40 bg-surface p-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">
              {shown.title}
            </p>
            <p className="text-xs text-muted">
              {shown.zone ? `${shown.zone} · ` : shown.focus ? `${shown.focus} · ` : ""}
              {(shown.total_meters ?? 0).toLocaleString("it-IT")} m · {shown.pool ?? 25} m
              {shown.done ? " · già svolto" : ""}
            </p>
          </div>
          <Link
            href={`/app/nuoto/${shown.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-blu to-navy px-3 py-2 text-sm font-semibold text-white"
          >
            Apri <ArrowRight size={15} />
          </Link>
        </div>
      ) : (
        <p className="text-xs text-muted">
          Passa il dito sulle carte per l&apos;anteprima, tocca per aprire.
        </p>
      )}
    </div>
  );
}
