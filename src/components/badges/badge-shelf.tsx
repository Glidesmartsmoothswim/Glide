import { Card } from "@/components/ui/card";

export type EarnedBadge = {
  code: string;
  name: string;
  emoji: string | null;
  description: string;
  note: string | null;
  conferred: boolean; // dato dal coach (raro) vs automatico
};

/** Vetrina badge del nuotatore. I conferiti dal coach hanno un bordo dedicato. */
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
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {earned.map((b) => (
            <li
              key={b.code}
              className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-center ${
                b.conferred
                  ? "border-blu/50 bg-blu/5"
                  : "border-border bg-background"
              }`}
              title={b.description}
            >
              <span className="text-2xl">{b.emoji ?? "🏅"}</span>
              <span className="t-small font-semibold">{b.name}</span>
              {b.conferred && (
                <span className="t-small text-blu">conferito da Alessio</span>
              )}
              {b.note && <span className="t-small text-muted">«{b.note}»</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
