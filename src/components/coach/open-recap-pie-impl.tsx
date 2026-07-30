"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

export type PieSlice = { label: string; value: number; color: string };

/** Torta del feedback post-sessione. Caricata lazy da open-recap-pie.tsx. */
export function OpenRecapPie({ data }: { data: PieSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0)
    return (
      <p className="py-8 text-center text-sm text-muted">
        Ancora nessun feedback post-sessione.
      </p>
    );
  return (
    <ResponsiveContainer width="100%" height={230}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={52}
          outerRadius={82}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }}
        />
        <Legend verticalAlign="bottom" height={28} />
      </PieChart>
    </ResponsiveContainer>
  );
}
