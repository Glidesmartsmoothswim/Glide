import Link from "next/link";
import { Lock } from "lucide-react";
import { TIER_LABEL, type Tier } from "@/lib/access";

/**
 * Invito NON aggressivo al piano (Onda 12.1.4): una riga + un pulsante.
 * Niente popup, niente urgenza. Riusato ovunque compaia contenuto bloccato.
 */
export function UpgradeHint({
  target,
  message,
  className = "",
}: {
  target: Tier;
  message?: string;
  className?: string;
}) {
  const label = TIER_LABEL[target];
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-background p-3 ${className}`}
    >
      <span className="flex items-center gap-2 text-sm text-muted">
        <Lock size={15} className="shrink-0" />
        {message ?? `Disponibile con il piano ${label}.`}
      </span>
      <Link
        href="/app/profilo"
        className="ml-auto rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white hover:bg-navy/90"
      >
        Scopri {label}
      </Link>
    </div>
  );
}
