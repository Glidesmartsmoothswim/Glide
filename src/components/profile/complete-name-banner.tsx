"use client";

import { useState, useTransition } from "react";
import { updateProfileName } from "@/app/app/profilo/actions";

/**
 * Prompt "completa il profilo" — mostrato quando manca nome o cognome.
 * Non bloccante (a differenza del gate di re-consenso): dismissibile con
 * "Più tardi", ricompare al prossimo accesso finché non viene salvato
 * (nessun flag di "rifiutato permanentemente" — non richiesto).
 */
export function CompleteNameBanner({
  firstName,
  lastName,
}: {
  firstName: string | null;
  lastName: string | null;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState(false);
  const [first, setFirst] = useState(firstName ?? "");
  const [last, setLast] = useState(lastName ?? "");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (dismissed || done) return null;

  return (
    <div className="mb-4 rounded-xl border border-blu/30 bg-blu/5 p-3">
      <p className="text-sm font-bold text-foreground">Completa il tuo profilo</p>
      <p className="mt-0.5 text-sm text-muted">
        Ci mancano nome e cognome — servono al coach per riconoscerti in
        agenda e sulla scheda.
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          value={first}
          onChange={(e) => setFirst(e.target.value)}
          placeholder="Nome"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-blu"
        />
        <input
          value={last}
          onChange={(e) => setLast(e.target.value)}
          placeholder="Cognome"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-blu"
        />
      </div>
      {error && <p className="mt-1 text-sm text-[#DC2626]">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await updateProfileName({
                first_name: first,
                last_name: last,
              });
              if (res.error) setError(res.error);
              else setDone(true);
            })
          }
          className="rounded-lg bg-gradient-to-br from-blu to-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "Salvo…" : "Salva"}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-ink"
        >
          Più tardi
        </button>
      </div>
    </div>
  );
}
