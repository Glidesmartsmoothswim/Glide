"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { signIn, signUp, verifyLoginMfa, signOut } from "./actions";

export function LoginForm({ justReset }: { justReset?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const busy = useRef(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    // Rete che si impianta: dopo 15s sblocchiamo comunque la UI.
    const watchdog = setTimeout(() => {
      if (busy.current) {
        busy.current = false;
        setLoading(false);
        setError("Sta impiegando troppo. Controlla la connessione e riprova.");
      }
    }, 15000);

    try {
      const res = mode === "signin" ? await signIn(formData) : await signUp(formData);
      if (!busy.current) return; // già sbloccato dal watchdog
      if (res.ok) {
        router.push(res.redirectTo);
        router.refresh();
        return;
      }
      if ("needsMfa" in res) {
        setMfaFactorId(res.factorId);
        return;
      }
      if ("email" in res) {
        setSentTo(res.email);
        return;
      }
      setError(res.error);
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      clearTimeout(watchdog);
      busy.current = false;
      setLoading(false);
    }
  }

  async function onSubmitMfa(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current || !mfaFactorId) return;
    busy.current = true;
    setError(null);
    setLoading(true);
    try {
      const res = await verifyLoginMfa(mfaFactorId, mfaCode);
      if (res.ok) {
        router.push(res.redirectTo);
        router.refresh();
        return;
      }
      if ("error" in res) setError(res.error);
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  if (mfaFactorId) {
    return (
      <div className="w-full max-w-sm">
        <h2 className="mb-2 text-center font-display text-lg text-white dark:text-foreground">
          Codice di verifica
        </h2>
        <p className="mb-4 text-center text-sm text-[#c7d4ee] dark:text-muted">
          Password corretta. Ora il codice dalla tua app authenticator.
        </p>
        <form onSubmit={onSubmitMfa} className="flex flex-col gap-3">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            placeholder="123456"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
            className="rounded-xl border border-white bg-white px-4 py-3 text-center text-lg tracking-[0.3em] text-navy outline-none placeholder:text-slate-500 focus:border-blu dark:border-border dark:bg-surface dark:text-foreground dark:placeholder:text-muted"
          />
          {error && <p className="text-sm text-[#ffd0d0]">{error}</p>}
          <button
            type="submit"
            disabled={loading || mfaCode.length !== 6}
            className="w-full rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-3 font-sans font-semibold text-white shadow-lg shadow-black/20 transition-opacity disabled:opacity-60"
          >
            {loading ? "Verifico…" : "Verifica"}
          </button>
        </form>
        <form action={signOut}>
          <button
            type="submit"
            className="mt-4 w-full text-center text-sm text-[#aebbdd] underline dark:text-muted"
          >
            Non sei tu? Esci
          </button>
        </form>
      </div>
    );
  }

  if (sentTo) {
    return (
      <div className="w-full max-w-sm text-center">
        <h2 className="font-display text-lg text-white dark:text-foreground">
          Controlla la tua email
        </h2>
        <p className="mt-2 text-sm text-[#c7d4ee] dark:text-muted">
          Abbiamo inviato un link di conferma a{" "}
          <span className="font-semibold text-white dark:text-foreground">
            {sentTo}
          </span>
          . Apri il link per attivare l&apos;account, poi accedi.
        </p>
        <button
          type="button"
          onClick={() => {
            setSentTo(null);
            setMode("signin");
          }}
          className="mt-6 text-sm text-[#aebbdd] underline dark:text-muted"
        >
          Torna all&apos;accesso
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      {justReset && (
        <p className="mb-4 rounded-xl bg-white/10 px-4 py-3 text-center text-sm text-[#c7d4ee]">
          Password aggiornata. Ora puoi accedere.
        </p>
      )}
      <div className="mb-6 flex rounded-xl bg-white p-1 text-sm dark:border dark:border-border dark:bg-surface">
        {(
          [
            ["signin", "Accedi"],
            ["signup", "Registrati"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setMode(id);
              setError(null);
            }}
            className={`flex-1 rounded-lg px-3 py-2 font-semibold transition-colors ${
              mode === id ? "bg-navy text-white" : "text-navy dark:text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input
            name="first_name"
            placeholder="Nome"
            autoComplete="given-name"
            className="rounded-xl border border-white bg-white px-4 py-3 text-navy outline-none placeholder:text-slate-500 focus:border-blu dark:border-border dark:bg-surface dark:text-foreground dark:placeholder:text-muted"
          />
        )}
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          autoComplete="email"
          className="rounded-xl border border-white bg-white px-4 py-3 text-navy outline-none placeholder:text-slate-500 focus:border-blu dark:border-border dark:bg-surface dark:text-foreground dark:placeholder:text-muted"
        />
        <input
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          placeholder={mode === "signup" ? "Password (min. 8 caratteri)" : "Password"}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="rounded-xl border border-white bg-white px-4 py-3 text-navy outline-none placeholder:text-slate-500 focus:border-blu dark:border-border dark:bg-surface dark:text-foreground dark:placeholder:text-muted"
        />

        {error && <p className="text-sm text-[#ffd0d0]">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-3 font-sans font-semibold text-white shadow-lg shadow-black/20 transition-opacity disabled:opacity-60"
        >
          {loading ? "Attendi…" : mode === "signin" ? "Entra" : "Crea account"}
        </button>

        {mode === "signin" && (
          <Link
            href="/forgot-password"
            className="mt-1 text-center text-sm text-[#c7d4ee] underline dark:text-muted"
          >
            Password dimenticata?
          </Link>
        )}
      </form>

      <p className="mt-6 text-center text-xs text-[#aebbdd] dark:text-muted">
        onda dopo onda
      </p>
    </div>
  );
}
