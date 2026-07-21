import { Check, X } from "lucide-react";
import type { ReactNode } from "react";

export type Feature = { label: string; included: boolean };

/**
 * Onda 18 — carta prezzo in stile "banner" (badge circolare + prezzo +
 * checklist ✓/✗ + CTA colorata). Unica, riusata in tutte le carte: le righe
 * feature allineate fanno saltare all'occhio le differenze fra i piani.
 */
export function PricingCard({
  name,
  color,
  price,
  period,
  saving,
  tagline,
  badge,
  features,
  cta,
}: {
  name: string;
  color: string; // hex o var(--…)
  price: string;
  period?: string;
  saving?: string;
  tagline?: string;
  badge?: string;
  features: Feature[];
  cta: ReactNode;
}) {
  return (
    <div className="relative flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-3 pb-4 pt-9 shadow-sm">
      {badge && (
        <span
          className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
          style={{ background: color }}
        >
          {badge}
        </span>
      )}
      <div
        className="grid h-16 w-16 shrink-0 place-items-center rounded-full px-1 text-center text-sm font-bold leading-tight text-white"
        style={{ background: color }}
      >
        {name}
      </div>

      <div className="text-center">
        <p className="font-display text-2xl text-foreground">{price}</p>
        {period && <p className="text-xs text-muted">{period}</p>}
        {saving && <p className="mt-0.5 text-xs font-semibold text-teal">{saving}</p>}
        {tagline && <p className="text-xs text-muted">{tagline}</p>}
      </div>

      <ul className="flex w-full flex-1 flex-col gap-1.5">
        {features.map((f) => (
          <li key={f.label} className="flex items-start gap-2 text-xs">
            {f.included ? (
              <Check size={14} className="mt-0.5 shrink-0 text-[#16A34A]" />
            ) : (
              <X size={14} className="mt-0.5 shrink-0 text-[#DC2626]" />
            )}
            <span className={f.included ? "text-foreground" : "text-muted"}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      <div className="w-full">{cta}</div>
    </div>
  );
}
