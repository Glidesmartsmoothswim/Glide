import { Check } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Onda 13.5 — carta prezzo unica, riusata in tutte e quattro le carte.
 * Ogni ritocco futuro si fa in un punto solo. Sobria: nessun countdown/urgenza.
 */
export function PricingCard({
  name,
  price,
  period,
  badge,
  saving,
  tagline,
  includes,
  cta,
  highlighted = false,
}: {
  name: string;
  price: string;
  period?: string;
  badge?: string;
  saving?: string;
  tagline?: string;
  includes: string[];
  cta: ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 ${
        highlighted
          ? "border-turchese bg-turchese/5"
          : "border-border bg-surface"
      }`}
    >
      <div className="flex items-center gap-2">
        <h3 className="font-display text-lg text-foreground">{name}</h3>
        {badge && (
          <span className="rounded-full bg-turchese/15 px-2 py-0.5 text-[11px] font-semibold text-teal">
            {badge}
          </span>
        )}
      </div>

      <div>
        <p className="font-display text-2xl text-foreground">
          {price}
          {period && (
            <span className="text-sm font-normal text-muted"> /{period}</span>
          )}
        </p>
        {saving && <p className="text-xs font-semibold text-teal">{saving}</p>}
        {tagline && <p className="text-xs text-muted">{tagline}</p>}
      </div>

      <ul className="flex flex-1 flex-col gap-1.5">
        {includes.map((line) => (
          <li key={line} className="flex items-start gap-2 text-sm text-foreground">
            <Check size={15} className="mt-0.5 shrink-0 text-teal" />
            {line}
          </li>
        ))}
      </ul>

      {cta}
    </div>
  );
}
