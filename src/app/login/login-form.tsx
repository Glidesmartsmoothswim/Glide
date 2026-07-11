"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signUp, type AuthState } from "./actions";

const initial: AuthState = {};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-3 font-sans font-semibold text-white transition-opacity disabled:opacity-60"
    >
      {pending ? "Attendi…" : label}
    </button>
  );
}

export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction] = useActionState(action, initial);

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex rounded-xl border border-border bg-surface p-1 text-sm">
        {(
          [
            ["signin", "Accedi"],
            ["signup", "Registrati"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`flex-1 rounded-lg px-3 py-2 font-semibold transition-colors ${
              mode === id ? "bg-navy text-white" : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input
            name="first_name"
            placeholder="Nome"
            autoComplete="given-name"
            className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-blu"
          />
        )}
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          autoComplete="email"
          className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-blu"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="rounded-xl border border-border bg-surface px-4 py-3 outline-none focus:border-blu"
        />

        {state.error && (
          <p className="text-sm text-[#DC2626]">{state.error}</p>
        )}
        {state.info && <p className="text-sm text-teal">{state.info}</p>}

        <SubmitButton label={mode === "signin" ? "Entra" : "Crea account"} />
      </form>

      <p className="mt-6 text-center text-xs text-muted">
        onda dopo onda
      </p>
    </div>
  );
}
