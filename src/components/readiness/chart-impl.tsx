"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export type Point = { label: string; value: number };

/**
 * Grafico progressi (area). Riusato per prontezza (0–100) e RPE (0–10).
 * Caricato in modo lazy da `chart.tsx` (recharts fuori dal bundle iniziale).
 */
export function ReadinessChart({
  points,
  color = "#0E5EAB",
  max = 100,
  unit = "",
}: {
  points: Point[];
  color?: string;
  max?: number;
  unit?: string;
}) {
  if (points.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">
        Ancora nessun dato: i grafici si popolano con i check-in.
      </p>
    );
  }
  const gid = "g" + color.replace("#", "");
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, max]} tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            formatter={(v) => [`${v}${unit}`, ""] as [string, string]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gid})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
