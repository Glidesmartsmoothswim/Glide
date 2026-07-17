import { Card } from "@/components/ui/card";
import {
  awardBadge,
  revokeBadge,
} from "@/app/coach/nuotatori/[id]/badge-actions";

type Conferred = {
  code: string;
  name: string;
  description: string;
};

/**
 * Controllo coach per i badge CONFERITI (Capitano, Occhio in Acqua).
 * La motivazione è OBBLIGATORIA, max 140 caratteri (FASE 6.1): è quella
 * frase il premio, il badge è solo la cornice. Nessuna emoji (registro
 * adulto). A un nuotatore in pausa non si conferisce nulla (ADR-005 §8).
 */
export function ConferBadges({
  swimmerId,
  conferred,
  earnedCodes,
  paused = false,
}: {
  swimmerId: string;
  conferred: Conferred[];
  earnedCodes: string[];
  paused?: boolean;
}) {
  if (paused) {
    return (
      <Card>
        <h2 className="t-h3 mb-1">Conferisci un badge</h2>
        <p className="t-small text-muted">
          In pausa: silenzio rispettoso. Niente badge né notifiche finché non
          torna (ADR-005).
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="t-h3 mb-1">Conferisci un badge</h2>
      <p className="t-small mb-3 text-muted">
        Questi li dai tu. La frase che scrivi è il premio: il nuotatore la
        leggerà con il badge.
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
                <div className="flex-1">
                  <p className="font-bold">{b.name}</p>
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
                    required
                    maxLength={140}
                    placeholder="La tua motivazione (obbligatoria, max 140)"
                    className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
                  />
                  <button className="rounded-lg bg-blu px-3 py-1.5 text-sm font-bold text-white">
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
