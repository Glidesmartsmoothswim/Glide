"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { acceptTermsPrivacy } from "@/app/app/legal-actions";
import { signOut } from "@/app/login/actions";

/**
 * Gate di re-consenso bloccante (GLIDE_CONSENSI.md §6, versione minima
 * Termini + Informativa). Non renderizza mai insieme al resto dell'app
 * (il layout swimmer sceglie l'uno o l'altro) — non è un modale sopra
 * contenuto già montato, per evitare fetch/side-effect inutili prima
 * dell'accettazione.
 */
export function ReconsentGate() {
  const [checked, setChecked] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 py-8">
      <div className="w-full rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h1 className="font-display text-xl text-foreground">Prima di continuare</h1>
        <p className="mt-2 text-sm text-muted">
          Abbiamo pubblicato Termini e Condizioni e Informativa Privacy.
          Per continuare a usare GLIDE devi leggerli e accettarli — è un
          passaggio unico, non te lo richiederemo più.
        </p>
        <p className="mt-3 text-sm">
          <Link
            href="/termini"
            target="_blank"
            className="font-bold text-blu underline"
          >
            Termini e Condizioni
          </Link>
          {" · "}
          <Link
            href="/privacy"
            target="_blank"
            className="font-bold text-blu underline"
          >
            Informativa Privacy
          </Link>
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5"
          />
          Ho letto e accetto i Termini e Condizioni e l&apos;Informativa
          Privacy.
        </label>
        {error && <p className="mt-2 text-sm text-[#DC2626]">{error}</p>}
        <button
          type="button"
          disabled={!checked || pending}
          onClick={() =>
            start(async () => {
              const res = await acceptTermsPrivacy();
              if (res.error) setError(res.error);
            })
          }
          className="mt-4 w-full rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-3 font-bold text-white disabled:opacity-50"
        >
          {pending ? "Un attimo…" : "Accetto e continuo"}
        </button>
        <form action={signOut} className="mt-3 text-center">
          <button
            type="submit"
            className="text-sm text-muted underline hover:text-foreground"
          >
            Non accetto, esci
          </button>
        </form>
      </div>
    </div>
  );
}
