"use client";
import React from "react";

export interface Fetta {
  label: string;
  value: number;
  color: string;
}

interface TortaProps {
  fette: Fetta[];
  size?: number;
  totale?: number; // override denominatore — fetta nascosta nel calcolo, non disegnata
  emptyColor?: string;
}

function arco(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const toXY = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = toXY(a0);
  const [x1, y1] = toXY(a1);
  const largeArc = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${largeArc} 1 ${x1} ${y1} Z`;
}

// Colori struttura (bordo/testo/legenda), NON zona: presi dai token GLIDE
// reali (ADR-009, globals.css), non dal placeholder --c-* del prompt sorgente.
export function Torta({ fette, size = 160, totale, emptyColor = "var(--border)" }: TortaProps) {
  const r = size / 2;
  const somma = totale ?? fette.reduce((acc, f) => acc + f.value, 0);

  if (somma <= 0) {
    return (
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Nessun dato">
        <circle cx={r} cy={r} r={r - 1} fill={emptyColor} />
      </svg>
    );
  }

  // Angolo cumulativo via reduce (non un `let` mutato durante il render):
  // ogni fetta parte dove finisce la precedente, in senso orario da ore 12.
  const { archi } = fette.filter((f) => f.value > 0).reduce(
    (state, f) => {
      const quota = (f.value / somma) * Math.PI * 2;
      const a0 = state.angolo;
      const a1 = a0 + quota;
      state.archi.push({ ...f, path: arco(r, r, r - 1, a0, a1) });
      state.angolo = a1;
      return state;
    },
    { archi: [] as (Fetta & { path: string })[], angolo: -Math.PI / 2 },
  );

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Distribuzione">
        {archi.map((f) => <path key={f.label} d={f.path} fill={f.color} />)}
      </svg>
      <ul className="legenda" style={{ listStyle: "none", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 14px", margin: 0, padding: 0 }}>
        {fette.map((f) => (
          <li key={f.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: f.color, flexShrink: 0 }} />
            <span style={{ color: "var(--ink)" }}>{f.label}</span>
            <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
              {Math.round((f.value / somma) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
