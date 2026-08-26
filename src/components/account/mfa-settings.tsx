"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldPlus, ShieldOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getMfaStatus,
  enrollTotp,
  verifyTotpCode,
  unenrollFactor,
} from "@/lib/mfa";
import { Pill } from "@/components/ui/card";

/**
 * 2FA (TOTP) sull'account — PROMPT_CODE_COACH_MFA.md FASE 1.
 * Feature di sicurezza generica: nessun gating per ruolo qui dentro. La pagina
 * che monta questo componente (profilo nuotatore o account coach) decide chi
 * la vede; il componente stesso non controlla `role`.
 */

const field =
  "rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blu";

type Phase =
  | { kind: "loading" }
  | { kind: "off" }
  | { kind: "enrolling"; factorId: string; qrCode: string; secret: string }
  | { kind: "on"; factorId: string }
  | { kind: "stepup"; factorId: string };

export function MfaSettings() {
  const [supabase] = useState(() => createClient());
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justActivated, setJustActivated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMfaStatus(supabase).then((status) => {
      if (cancelled) return;
      setPhase(
        status.active && status.factor
          ? { kind: "on", factorId: status.factor.id }
          : { kind: "off" },
      );
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    setError(null);
    setBusy(true);
    try {
      const res = await enrollTotp(supabase);
      if (!res.ok) return setError(res.error);
      setPhase({ kind: "enrolling", factorId: res.factorId, qrCode: res.qrCode, secret: res.secret });
    } finally {
      setBusy(false);
    }
  }

  async function cancelEnroll(factorId: string) {
    // Enrollment abbandonato: pulizia best-effort, il fattore non è mai stato
    // verificato quindi non serve aal2 per toglierlo.
    try {
      await supabase.auth.mfa.unenroll({ factorId });
    } catch {
      /* fattore incompleto orfano: innocuo, non blocca l'utente */
    }
    setCode("");
    setError(null);
    setPhase({ kind: "off" });
  }

  async function confirmEnroll(factorId: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await verifyTotpCode(supabase, factorId, code);
      if (!res.ok) return setError(res.error);
      setCode("");
      setJustActivated(true);
      setPhase({ kind: "on", factorId });
    } finally {
      setBusy(false);
    }
  }

  async function startUnenroll(factorId: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await unenrollFactor(supabase, factorId);
      if (res.ok) return setPhase({ kind: "off" });
      if (res.needsStepUp) return setPhase({ kind: "stepup", factorId });
      setError(res.error);
    } finally {
      setBusy(false);
    }
  }

  async function confirmStepUpAndUnenroll(factorId: string) {
    setError(null);
    setBusy(true);
    try {
      const verified = await verifyTotpCode(supabase, factorId, code);
      if (!verified.ok) return setError(verified.error);
      setCode("");
      const res = await unenrollFactor(supabase, factorId);
      if (!res.ok) return setError(res.error);
      setPhase({ kind: "off" });
    } finally {
      setBusy(false);
    }
  }

  if (phase.kind === "loading") {
    return <p className="text-sm text-muted">Verifico lo stato…</p>;
  }

  if (phase.kind === "off") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          Aggiungi un secondo passaggio al login con un&apos;app authenticator
          (Google Authenticator, 1Password, Authy…).
        </p>
        {error && <p className="text-sm text-[#DC2626]">{error}</p>}
        <button
          type="button"
          onClick={startEnroll}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          <ShieldPlus size={16} />
          {busy ? "Preparo…" : "Attiva 2FA"}
        </button>
      </div>
    );
  }

  if (phase.kind === "enrolling") {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground">
          Scansiona il QR con la tua app authenticator, oppure inserisci il
          codice a mano:
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- data-URI SVG generato da Supabase, non un asset del sito */}
        <img
          src={
            phase.qrCode.startsWith("data:")
              ? phase.qrCode
              : `data:image/svg+xml;utf-8,${phase.qrCode}`
          }
          alt="QR code per l'app authenticator"
          className="h-40 w-40 self-center rounded-lg border border-border bg-white p-2"
        />
        <p className="break-all rounded-lg bg-background p-2 text-center text-xs text-muted">
          {phase.secret}
        </p>
        <label className="flex flex-col gap-1 text-sm text-muted">
          Codice a 6 cifre
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={field}
          />
        </label>
        {error && <p className="text-sm text-[#DC2626]">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => cancelEnroll(phase.factorId)}
            disabled={busy}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted disabled:opacity-60"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={() => confirmEnroll(phase.factorId)}
            disabled={busy || code.length !== 6}
            className="flex-1 rounded-xl bg-gradient-to-br from-blu to-navy py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? "Verifico…" : "Verifica e attiva"}
          </button>
        </div>
      </div>
    );
  }

  if (phase.kind === "on") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Pill tone="ok">
            <ShieldCheck size={14} className="mr-1 inline" />
            2FA attiva
          </Pill>
        </div>
        {justActivated && (
          <p className="rounded-xl bg-amber-500/5 p-3 text-sm text-muted">
            2FA attiva. Se perdi l&apos;accesso all&apos;app authenticator, non
            potremo recuperare l&apos;account: registra un secondo fattore di
            backup ora, con un&apos;altra app o device.
          </p>
        )}
        {error && <p className="text-sm text-[#DC2626]">{error}</p>}
        <button
          type="button"
          onClick={() => startUnenroll(phase.factorId)}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted hover:text-foreground disabled:opacity-60"
        >
          <ShieldOff size={16} />
          {busy ? "..." : "Disattiva"}
        </button>
      </div>
    );
  }

  // phase.kind === "stepup"
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground">
        Per disattivare la 2FA, verifica prima un codice dalla tua app
        authenticator (questa sessione non l&apos;ha ancora fatto).
      </p>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Codice a 6 cifre
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className={field}
        />
      </label>
      {error && <p className="text-sm text-[#DC2626]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setCode("");
            setError(null);
            setPhase({ kind: "on", factorId: phase.factorId });
          }}
          disabled={busy}
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-muted disabled:opacity-60"
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={() => confirmStepUpAndUnenroll(phase.factorId)}
          disabled={busy || code.length !== 6}
          className="flex-1 rounded-xl bg-gradient-to-br from-blu to-navy py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? "Verifico…" : "Verifica e disattiva"}
        </button>
      </div>
    </div>
  );
}
