import { Card } from "@/components/ui/card";
import { ondaLabel, WEIGHTS, type Dimensions } from "@/lib/score";
import type { ScoreResult } from "@/lib/score/compute";

/** Onda: sempre visibile, mai colpevolizzante. Bassa = "acqua calma". */
export function OndaCard({ onda }: { onda: number }) {
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <h2 className="t-h3">Onda</h2>
        <span className="t-small text-muted">{ondaLabel(onda)}</span>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-background">
        <div
          className="h-full rounded-full bg-gradient-to-r from-navy via-blu to-turchese transition-all"
          style={{ width: `${Math.max(3, onda)}%` }}
        />
      </div>
      <p className="t-small mt-2 text-muted">
        {onda >= 45
          ? "Onda dopo onda. Continua così."
          : "L'acqua è calma. Nessuna serie da difendere: si ricomincia quando vuoi."}
      </p>
    </Card>
  );
}

const DIM_LABEL: Record<keyof Dimensions, string> = {
  costanza: "Costanza",
  continuita: "Continuità",
  qualita: "Qualità",
  aderenza: "Aderenza",
  miglioramento: "Miglioramento",
};

function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-background">
      <div
        className="h-full rounded-full bg-blu"
        style={{ width: `${Math.max(2, value)}%` }}
      />
    </div>
  );
}

/**
 * Glide Score. Mostrato solo con dati sufficienti (`ready`): un numero rumoroso
 * spacciato per progresso è peggio di nessun numero. `showBreakdown` per il coach.
 */
export function GlideScoreCard({
  result,
  showBreakdown = false,
}: {
  result: ScoreResult;
  showBreakdown?: boolean;
}) {
  if (!result.ready) {
    return (
      <Card>
        <h2 className="t-h3">Glide Score</h2>
        <p className="t-small mt-2 text-muted">
          Stiamo ancora raccogliendo dati. Il tuo Glide Score comparirà tra
          qualche settimana di check-in — così è un numero di cui fidarsi, non un
          rumore.
        </p>
      </Card>
    );
  }

  const dims = result.dims;
  const keys = Object.keys(DIM_LABEL) as (keyof Dimensions)[];

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blu to-navy text-white">
          <span className="text-2xl font-bold">{result.score}</span>
        </div>
        <div>
          <h2 className="t-h3">Glide Score</h2>
          <p className="t-small text-muted">
            {result.frozen
              ? "Congelato: sei in pausa. Nessuno ti penalizza mentre ti curi."
              : "Si muove piano, e mai per colpa dell'età."}
          </p>
        </div>
      </div>

      {showBreakdown && (
        <ul className="mt-4 flex flex-col gap-2">
          {keys.map((k) => (
            <li key={k} className="flex items-center gap-3">
              <span className="w-28 t-small text-muted">
                {DIM_LABEL[k]}
                <span className="text-muted/50"> · {WEIGHTS[k]}</span>
              </span>
              <Bar value={dims[k]} />
              <span className="w-8 text-right t-data">{dims[k]}</span>
              {result.insufficient.includes(k) && (
                <span className="t-small text-muted/60" title="Dati insufficienti: stima neutra">
                  ~
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
