"use client";

import { useActionState, useState } from "react";
import { MessageCircle } from "lucide-react";
import { requestWorkoutChange, type RequestChangeState } from "@/app/app/nuoto/request-actions";

/**
 * Onda 29.4 — sostituisce il self-scaling +/- (Onda 27.3, rimosso): il
 * nuotatore non modifica più la seduta da solo. Scrive una nota, che arriva
 * ad Alessio come richiesta — mai un update diretto sull'allenamento
 * (ADR-001). "L'allenamento lo scrive Alessio" resta vero anche qui.
 */
export function RequestChangeButton({ workoutId }: { workoutId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(
    requestWorkoutChange,
    {} as RequestChangeState,
  );

  if (state.info) {
    return <p className="text-sm text-teal">{state.info}</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-blu"
      >
        <MessageCircle size={15} /> Chiedi una modifica
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="workout_id" value={workoutId} />
      <label className="flex flex-col gap-1 text-sm text-muted">
        Cosa vorresti cambiare?
        <textarea
          name="note"
          required
          maxLength={500}
          rows={3}
          placeholder="Es. oggi non ce la faccio con questo volume, la spalla è stanca…"
          className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blu"
        />
      </label>
      {state.error && <p className="text-sm text-[#DC2626]">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-2.5 text-sm font-bold text-white"
        >
          Invia ad Alessio
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-muted"
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
