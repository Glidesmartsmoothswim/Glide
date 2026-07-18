"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestReset, type ForgotState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-3 font-sans font-semibold text-white shadow-lg shadow-black/20 transition-opacity disabled:opacity-60"
    >
      {pending ? "Invio…" : "Invia il link"}
    </button>
  );
}

export function ForgotForm({ linkError }: { linkError?: boolean }) {
  const [state, formAction] = useActionState(requestReset, {} as ForgotState);

  if (state.sent) {
    return (
      <div className="w-full max-w-sm text-center">
        <p className="text-[#eaf1ff] dark:text-foreground">
          Se l&apos;indirizzo è registrato, ti abbiamo inviato un link per
          reimpostare la password. Controlla la posta (anche lo spam).
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-[#c7d4ee] underline dark:text-muted"
        >
          Torna all&apos;accesso
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
      {linkError && (
        <p className="text-sm text-[#ffd0d0]">
          Il link non è più valido. Richiedi un nuovo ripristino qui sotto.
        </p>
      )}
      <input
        name="email"
        type="email"
        required
        placeholder="La tua email"
        autoComplete="email"
        className="rounded-xl border border-white bg-white px-4 py-3 text-navy outline-none placeholder:text-slate-500 focus:border-blu dark:border-border dark:bg-surface dark:text-foreground dark:placeholder:text-muted"
      />
      {state.error && <p className="text-sm text-[#ffd0d0]">{state.error}</p>}
      <SubmitButton />
      <Link
        href="/login"
        className="mt-2 text-center text-xs text-[#aebbdd] underline dark:text-muted"
      >
        Torna all&apos;accesso
      </Link>
    </form>
  );
}
