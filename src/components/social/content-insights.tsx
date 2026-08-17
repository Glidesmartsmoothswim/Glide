import { Card, Pill } from "@/components/ui/card";
import { KIND_LABEL, type LibraryKind } from "@/lib/library";

/**
 * Onda 28.2 — "Riepilogo contenuti & idee per i prossimi post" sul planner
 * social: cosa guardano davvero gli atleti (libreria + focus Canale Open) e
 * cosa dicono di voler approfondire (feedback settimanale). Solo aggregati:
 * niente nomi, coerente con "Preferenze" di /coach/open (Onda 27.2).
 */
export function ContentInsights({
  topLibrary,
  topFocus,
  topTopics,
  avgRating,
  responses,
  currentWeekResponses,
  swimmerCount,
  notes,
}: {
  topLibrary: { id: string; n: number; title: string; kind: LibraryKind }[];
  topFocus: [string, number][];
  topTopics: { id: string; label: string; n: number }[];
  avgRating: number | null;
  responses: number;
  currentWeekResponses: number;
  swimmerCount: number;
  notes: { rating: number; note: string; week_start: string }[];
}) {
  const nothingYet =
    topLibrary.length === 0 &&
    topFocus.length === 0 &&
    topTopics.length === 0 &&
    responses === 0;

  if (nothingYet) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-lg text-foreground">
          Riepilogo contenuti &amp; idee per i prossimi post
        </h2>
        <Pill tone="brand">test</Pill>
      </div>
      <p className="text-sm text-muted">
        Cosa guardano gli atleti e cosa dicono di voler approfondire — in
        aggregato, come base per pianificare il feed.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {topLibrary.length > 0 && (
          <Card className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-foreground">
              Contenuti Libreria più aperti
            </p>
            {topLibrary.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-foreground">{i.title}</span>
                <span className="shrink-0 text-muted">
                  {KIND_LABEL[i.kind]} · {i.n}×
                </span>
              </div>
            ))}
          </Card>
        )}

        {topFocus.length > 0 && (
          <Card className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-foreground">
              Focus Canale Open più scelti
            </p>
            {topFocus.map(([focus, n]) => (
              <div key={focus} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{focus}</span>
                <span className="text-muted">{n}×</span>
              </div>
            ))}
          </Card>
        )}

        {topTopics.length > 0 && (
          <Card className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-foreground">
              Cosa vogliono approfondire (feedback settimanale)
            </p>
            {topTopics.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{t.label}</span>
                <span className="text-muted">{t.n}×</span>
              </div>
            ))}
          </Card>
        )}

        {responses > 0 && (
          <Card className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-foreground">
              Partecipazione al feedback
            </p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">Umore medio settimanale</span>
              <span className="text-muted">
                {avgRating != null ? avgRating.toFixed(1) : "—"}/5
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">Risposte questa settimana</span>
              <span className="text-muted">
                {currentWeekResponses}
                {swimmerCount ? `/${swimmerCount}` : ""}
              </span>
            </div>
          </Card>
        )}
      </div>

      {notes.length > 0 && (
        <Card className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-foreground">
            Ultime note (feedback settimanale)
          </p>
          {notes.map((n, idx) => (
            <p key={idx} className="rounded-lg bg-background px-3 py-2 text-sm text-muted">
              <span className="font-semibold text-foreground">{n.rating}/5</span> ·
              {" "}«{n.note}»
            </p>
          ))}
        </Card>
      )}
    </section>
  );
}
