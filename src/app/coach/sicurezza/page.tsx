import { Card } from "@/components/ui/card";
import { MfaSettings } from "@/components/account/mfa-settings";

export const metadata = { title: "Sicurezza" };

/**
 * Sicurezza account coach — PROMPT_CODE_COACH_MFA.md FASE 1.
 * Route statica: ha la precedenza su `/coach/[section]` (che gestisce solo i
 * placeholder). Nessun gating extra qui: il layout coach già richiede
 * `role === "coach"`; il componente MfaSettings non fa distinzioni di ruolo.
 */
export default function CoachSicurezza() {
  return (
    <div className="flex max-w-lg flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl text-foreground">Sicurezza</h1>
        <p className="t-small text-muted">
          Il tuo account vede i dati sanitari di tutti i nuotatori: proteggilo
          con un secondo fattore.
        </p>
      </header>
      <Card>
        <MfaSettings />
      </Card>
    </div>
  );
}
