"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updatePassword, type ResetState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-3 font-sans font-semibold text-white shadow-lg shadow-black/20 transition-opacity disabled:opacity-60"
    >
      {pending ? "Salvo…" : "Imposta la nuova password"}
    </button>
  );
}

export function ResetForm() {
  const [state, formAction] = useActionState(updatePassword, {} as ResetState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-3">
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="Nuova password (min. 8 caratteri)"
        autoComplete="new-password"
        className="rounded-xl border border-white bg-white px-4 py-3 text-navy outline-none placeholder:text-slate-500 focus:border-blu dark:border-border dark:bg-surface dark:text-foreground dark:placeholder:text-muted"
      />
      <input
        name="confirm"
        type="password"
        required
        minLength={8}
        placeholder="Conferma la nuova password"
        autoComplete="new-password"
        className="rounded-xl border border-white bg-white px-4 py-3 text-navy outline-none placeholder:text-slate-500 focus:border-blu dark:border-border dark:bg-surface dark:text-foreground dark:placeholder:text-muted"
      />
      {state.error && <p className="text-sm text-[#ffd0d0]">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
