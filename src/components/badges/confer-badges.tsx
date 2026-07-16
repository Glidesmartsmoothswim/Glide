import { Card } from "@/components/ui/card";
import {
  awardBadge,
  revokeBadge,
} from "@/app/coach/nuotatori/[id]/badge-actions";

type Conferred = {
  code: string;
  name: string;
  emoji: string | null;
  description: string;
};

/**
 * Controllo coach per i badge CONFERITI (Capitano, Occhio in Acqua).
 * Un badge dato dall'algoritmo è un fatto; uno dato dal coach è un giudizio —
 * la merce rara. Una riga di nota lo rende un messaggio, non un adesivo.
 */
export function ConferBadges({
  swimmerId,
  conferred,
  earnedCodes,
}: {
  swimmerId: string;
  conferred: Conferred[];
  earnedCodes: string[];
}) {
  return (
    <Card>
      <h2 className="t-h3 mb-1">Conferisci un badge</h2>
      <p className="t-small mb-3 text-muted">
        Questi li dai tu. Valgono più di cento trofei di pixel.
      </p>
      <ul className="flex flex-col gap-3">
        {conferred.map((b) => {
          const earned = earnedCodes.includes(b.code);
          return (
            <li
              key={b.code}
              className="rounded-xl border border-border bg-background p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{b.emoji ?? "🏅"}</span>
                <div className="flex-1">
                  <p className="font-semibold">{b.name}</p>
                  <p className="t-small text-muted">{b.description}</p>
                </div>
                {earned && (
                  <form action={revokeBadge}>
                    <input type="hidden" name="swimmer_id" value={swimmerId} />
                    <input type="hidden" name="badge_code" value={b.code} />
                    <button className="rounded-md border border-border px-2 py-1 text-xs text-[#DC2626] hover:bg-surface">
                      Revoca
                    </button>
                  </form>
                )}
              </div>
              {!earned && (
                <form action={awardBadge} className="mt-2 flex flex-wrap gap-2">
                  <input type="hidden" name="swimmer_id" value={swimmerId} />
                  <input type="hidden" name="badge_code" value={b.code} />
                  <input
                    name="note"
                    placeholder="Una riga tua (facoltativa)"
                    className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
                  />
                  <button className="rounded-lg bg-blu px-3 py-1.5 text-sm font-semibold text-white">
                    Conferisci
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
