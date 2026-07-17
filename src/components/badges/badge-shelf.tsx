import { Card } from "@/components/ui/card";

export type EarnedBadge = {
  code: string;
  name: string;
  description: string;
  note: string | null;
  conferred: boolean; // dato dal coach (raro) vs automatico
};

/**
 * Vetrina badge del nuotatore. Registro adulto (FASE 6.2): nessuna emoji,
 * nessun coriandolo. I conferiti dal coach si distinguono per il bordo e
 * per la frase di Alessio — è quella il premio, il badge è la cornice.
 */
export function BadgeShelf({
  earned,
  emptyHint,
}: {
  earned: EarnedBadge[];
  emptyHint?: string;
}) {
  return (
    <Card>
      <h2 className="t-h3 mb-3">Badge</h2>
      {earned.length === 0 ? (
        <p className="t-small text-muted">
          {emptyHint ??
            "Ancora nessuno. Non sono adesivi: ognuno si guadagna, onda dopo onda."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {earned.map((b) => (
            <li
              key={b.code}
              className={`rounded-xl border px-4 py-3 ${
                b.conferred
                  ? "border-navy/50 bg-navy/5"
                  : "border-border bg-background"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold">{b.name}</span>
                {b.conferred && (
                  <span className="t-small uppercase tracking-[0.09em] text-navy">
                    da Alessio
                  </span>
                )}
              </div>
              <p className="t-small text-muted">{b.description}</p>
              {b.note && (
                <p className="t-small mt-1 border-l-2 border-navy/40 pl-2 text-foreground">
                  «{b.note}»
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
