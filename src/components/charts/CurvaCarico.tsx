"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ZONE_COLOR, ORDINE_BARRA, type ZonaBucket } from "@/lib/chart-tokens";

export interface SettimanaVolume {
  iso: string; // lunedì della settimana, ISO date
  fase?: string;
  volumi: Partial<Record<ZonaBucket, number>>;
}

export interface GaraMarker {
  label: string;
  data: string; // ISO date esatta, dentro la settimana
}

interface CurvaCaricoProps {
  settimane: SettimanaVolume[];
  gare?: GaraMarker[];
  altezza?: number;
}

const W_FISSO = 26, GAP_FISSO = 4, W_MIN = 7, GAP_MIN = 2;
const PAD_TOP = 24, PAD_BOTTOM = 36;

export function CurvaCarico({ settimane, gare = [], altezza = 220 }: CurvaCaricoProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [larghezzaDisponibile, setLarghezzaDisponibile] = useState(0);

  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => setLarghezzaDisponibile(entries[0].contentRect.width));
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const n = settimane.length;
  const larghezzaFissa = n * (W_FISSO + GAP_FISSO);
  const compressa = larghezzaFissa > larghezzaDisponibile && larghezzaDisponibile > 0;

  const { barW, gap } = useMemo(() => {
    if (!compressa) return { barW: W_FISSO, gap: GAP_FISSO };
    const target = larghezzaDisponibile / n;
    const scala = Math.max(0, Math.min(1, (target - (W_MIN + GAP_MIN)) / ((W_FISSO + GAP_FISSO) - (W_MIN + GAP_MIN))));
    return {
      barW: Math.max(W_MIN, W_MIN + scala * (W_FISSO - W_MIN)),
      gap: Math.max(GAP_MIN, GAP_MIN + scala * (GAP_FISSO - GAP_MIN)),
    };
  }, [compressa, larghezzaDisponibile, n]);

  const compatta = barW < 14;
  const passo = barW + gap;
  const larghezzaSvg = n * passo + gap;
  const H = altezza;

  const totali = settimane.map((s) => ORDINE_BARRA.reduce((acc, z) => acc + (s.volumi[z] ?? 0), 0));
  const maxTot = Math.max(1, ...totali);

  const xMarkerGara = (g: GaraMarker) => {
    const idx = settimane.findIndex((s) => {
      const inizio = new Date(s.iso);
      const fine = new Date(inizio);
      fine.setDate(fine.getDate() + 6);
      const d = new Date(g.data);
      return d >= inizio && d <= fine;
    });
    if (idx === -1) return null;
    const inizio = new Date(settimane[idx].iso);
    const offsetGiorni = (new Date(g.data).getTime() - inizio.getTime()) / 86400000;
    return gap + idx * passo + (offsetGiorni / 7) * barW;
  };

  return (
    <div ref={wrapRef} style={{ width: "100%", overflowX: "auto" }}>
      <svg width={larghezzaSvg} height={H + PAD_TOP + PAD_BOTTOM} role="img" aria-label="Volume settimanale per zona">
        {settimane.map((s, i) => {
          if (i === 0 || s.fase === settimane[i - 1].fase) return null;
          const x = gap + i * passo - gap / 2;
          return (
            <g key={`fase-${i}`}>
              <line x1={x} y1={PAD_TOP - 8} x2={x} y2={PAD_TOP + H} stroke="var(--border)" strokeDasharray="2 3" />
              <text x={x + 4} y={PAD_TOP - 10} fontSize={14} fill="var(--muted)">{s.fase}</text>
            </g>
          );
        })}

        {settimane.map((s, i) => {
          const tot = totali[i];
          const barH = (tot / maxTot) * H;
          let yCursor = PAD_TOP + (H - barH);
          const x = gap + i * passo;
          return (
            <g key={s.iso}>
              {ORDINE_BARRA.map((z) => {
                const v = s.volumi[z] ?? 0;
                if (v <= 0) return null;
                const h = (v / maxTot) * H;
                const y = yCursor;
                yCursor += h;
                return <rect key={z} x={x} y={y} width={barW} height={h} fill={ZONE_COLOR[z]} />;
              })}
              {!compatta && (
                <text x={x + barW / 2} y={PAD_TOP + H + 16} fontSize={14} textAnchor="middle" fill="var(--muted)">
                  {s.iso.slice(8, 10)}/{s.iso.slice(5, 7)}
                </text>
              )}
            </g>
          );
        })}

        {gare.map((g) => {
          const x = xMarkerGara(g);
          if (x === null) return null;
          return (
            <g key={g.label}>
              <line x1={x} y1={PAD_TOP - 4} x2={x} y2={PAD_TOP + H} stroke="var(--blu)" strokeDasharray="3 3" />
              <text x={x} y={PAD_TOP - 8} fontSize={14} textAnchor="middle">🏁 {g.label}</text>
            </g>
          );
        })}
      </svg>

      <ul className="legenda legenda-oriz" style={{ listStyle: "none", display: "flex", gap: 14, padding: 0, marginTop: 8 }}>
        {ORDINE_BARRA.slice().reverse().map((z) => (
          <li key={z} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: ZONE_COLOR[z] }} />
            <span>{z}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
