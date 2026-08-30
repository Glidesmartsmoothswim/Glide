"use client";

import { useState, useTransition } from "react";
import { setGroupLessonAffiliate, setExtraLessonPriceOverride } from "./pricing-actions";

/** Coach — leve di prezzo per-nuotatore (Sprint C.3, ADR-015 estesa):
 *  affiliazione (sconto lezione di gruppo) + override lezione extra. */
export function PricingPanel({
  swimmerId,
  groupLessonAffiliate,
  extraLessonPriceOverrideCents,
}: {
  swimmerId: string;
  groupLessonAffiliate: boolean;
  extraLessonPriceOverrideCents: number | null;
}) {
  const [affiliate, setAffiliate] = useState(groupLessonAffiliate);
  const [overrideEuro, setOverrideEuro] = useState(
    extraLessonPriceOverrideCents != null
      ? String(extraLessonPriceOverrideCents / 100)
      : "",
  );
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Affiliato</p>
          <p className="text-xs text-muted">
            Lezione di gruppo scontata a 5€ invece di 10€.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const next = !affiliate;
              setAffiliate(next);
              const res = await setGroupLessonAffiliate(swimmerId, next);
              setMsg(res.info ?? res.error ?? null);
              if (res.error) setAffiliate(!next);
            })
          }
          className={`h-6 w-11 rounded-full transition-colors ${
            affiliate ? "bg-blu" : "bg-border"
          }`}
        >
          <span
            className={`block h-5 w-5 translate-x-0.5 rounded-full bg-white transition-transform ${
              affiliate ? "translate-x-[22px]" : ""
            }`}
          />
        </button>
      </div>

      <div>
        <p className="text-sm font-semibold text-foreground">
          Sconto lezione extra (€)
        </p>
        <p className="mb-1 text-xs text-muted">
          Sostituisce il prezzo di listino per le lezioni private fuori piano
          saldate cash. Vuoto = prezzo standard.
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            step="1"
            value={overrideEuro}
            onChange={(e) => setOverrideEuro(e.target.value)}
            placeholder="es. 35"
            className="w-28 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-blu"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const euros = overrideEuro.trim() === "" ? null : Number(overrideEuro);
                const res = await setExtraLessonPriceOverride(swimmerId, euros);
                setMsg(res.info ?? res.error ?? null);
              })
            }
            className="rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink hover:border-blu/40"
          >
            Salva
          </button>
        </div>
      </div>
      {msg && <p className="text-xs text-teal">{msg}</p>}
    </div>
  );
}
