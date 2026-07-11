import { Construction } from "lucide-react";

/**
 * Segnaposto Sprint 0: la sezione esiste (impalcatura) ma la funzione
 * arriverà negli sprint successivi. `simulated` mostra il badge quando
 * l'integrazione (Stripe/Resend) non è configurata.
 */
export function Placeholder({
  title,
  subtitle,
  simulated = false,
}: {
  title: string;
  subtitle?: string;
  simulated?: boolean;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-2xl text-foreground">{title}</h1>
        {simulated && (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-[#B45309]">
            simulato
          </span>
        )}
      </div>
      {subtitle && <p className="max-w-prose text-muted">{subtitle}</p>}

      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-dashed border-border bg-surface p-6 text-muted">
        <Construction size={20} className="shrink-0 text-blu" />
        <span className="text-sm">
          Sezione in costruzione — impalcatura pronta, funzioni negli sprint
          successivi.
        </span>
      </div>
    </section>
  );
}
