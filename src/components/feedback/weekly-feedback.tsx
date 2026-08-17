"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  submitWeeklyFeedback,
  type FeedbackState,
} from "@/app/app/feedback-actions";
import { FEEDBACK_TOPICS, RATING_ANCHORS } from "@/lib/feedback";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 w-full rounded-xl bg-gradient-to-br from-blu to-navy py-3 font-bold text-white disabled:opacity-60"
    >
      {pending ? "Invio…" : "Invia ad Alessio"}
    </button>
  );
}

/**
 * Onda 28.2 — proposta di feedback settimanale, non invasiva: una card in
 * home (mai un popup), saltabile senza conseguenze, che torna la settimana
 * dopo. Compare solo se il nuotatore non ha già risposto per la settimana
 * corrente (`hasSubmitted`, calcolato server-side).
 */
export function WeeklyFeedbackPrompt({
  hasSubmitted,
}: {
  hasSubmitted: boolean;
}) {
  const [state, action] = useActionState(submitWeeklyFeedback, {} as FeedbackState);
  const [dismissed, setDismissed] = useState(false);
  const [rating, setRating] = useState(0);
  const [topics, setTopics] = useState<string[]>([]);

  const toggleTopic = (id: string) =>
    setTopics((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  if (hasSubmitted && !state.info) return null;
  if (dismissed) return null;

  if (state.info) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-5 text-center">
        <p className="mb-1 text-2xl" aria-hidden>
          🙌
        </p>
        <p className="t-body font-bold text-foreground">{state.info}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blu/30 bg-surface p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          💬
        </span>
        <div className="flex-1">
          <p className="t-body font-bold text-foreground">
            Come è andata questa settimana?
          </p>
          <p className="t-small text-muted">
            Un minuto: aiuta Alessio a capire cosa proporre.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-lg px-2 py-1 t-small font-bold text-muted hover:text-foreground"
        >
          Salta
        </button>
      </div>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="rating" value={rating || ""} />
        <div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`flex-1 rounded-lg border py-2.5 text-base font-bold transition-colors ${
                  rating === n
                    ? "border-blu bg-blu text-white"
                    : "border-border bg-background text-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="mt-1 t-small font-bold text-foreground">
              {RATING_ANCHORS[rating]}
            </p>
          )}
        </div>

        <div>
          <div className="mb-1.5 t-small font-bold text-foreground">
            Cosa ti piacerebbe approfondire?
          </div>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_TOPICS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTopic(t.id)}
                className={`rounded-full border px-3 py-1.5 t-small font-bold ${
                  topics.includes(t.id)
                    ? "border-blu bg-blu text-white"
                    : "border-border text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {topics.map((t) => (
            <input key={t} type="hidden" name="topics" value={t} />
          ))}
        </div>

        <textarea
          name="note"
          rows={2}
          placeholder="Una nota per Alessio (facoltativa)"
          className="rounded-xl border border-border bg-background px-3 py-2.5 t-body outline-none focus:border-blu"
        />

        {state.error && (
          <p className="t-small font-bold text-[#B45309]">{state.error}</p>
        )}
        <Submit />
      </form>
    </div>
  );
}
