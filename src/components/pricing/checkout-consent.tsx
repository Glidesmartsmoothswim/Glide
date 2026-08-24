"use client";

import { useState } from "react";

/**
 * glide-ext-recesso.md §2 — testo esatto, non riformulare (stesso principio
 * del copy fissato in onboarding/S6).
 */
const WAIVER_TEXT =
  "Richiedo l'esecuzione immediata del servizio e sono consapevole di perdere il diritto di recesso di 14 giorni una volta iniziato l'utilizzo (Art. 59, lett. a, Codice del Consumo).";

/**
 * CTA di un checkout online (Stripe): la checkbox NON è pre-flaggata e il
 * pagamento resta disabilitato finché non viene spuntata (§2/§4). La prova
 * della rinuncia è comunque scritta e verificata lato server (vedi actions.ts)
 * — questo componente è solo il gate della UI, non l'unica difesa.
 */
export function CheckoutConsent({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  const [waived, setWaived] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-start gap-2 text-sm text-muted">
        <input
          type="checkbox"
          name="withdrawal_waived"
          checked={waived}
          onChange={(e) => setWaived(e.target.checked)}
          className="mt-0.5 shrink-0"
        />
        <span>{WAIVER_TEXT}</span>
      </label>
      <button
        type="submit"
        disabled={!waived}
        style={waived ? { background: color } : undefined}
        className="w-full rounded-lg py-2.5 text-sm font-bold text-white disabled:bg-background disabled:text-muted"
      >
        {label}
      </button>
    </div>
  );
}
