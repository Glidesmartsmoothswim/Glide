"use client";

import { useState } from "react";
import { CheckoutConsent } from "@/components/pricing/checkout-consent";
import {
  WORKOUT_FREQUENCIES,
  CHECKIN_CADENCES,
  CHECKIN_CADENCE_LABEL,
  CHECKIN_CHANNELS,
  CHECKIN_CHANNEL_LABEL,
  eliteMonthlyPriceCents,
  eliteTotalPriceCents,
  eliteSeasonQuote,
  type WorkoutFrequency,
  type CheckinCadence,
  type CheckinChannel,
  type BillingPeriod,
} from "@/lib/payment/elite-pricing";
import { startEliteActivation, startEliteSeasonActivation } from "./actions";

const euro = (cents: number) => `€ ${(cents / 100).toFixed(2).replace(".00", "")}`;

const selectClass =
  "mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-sm outline-none focus:border-blu";

/**
 * 1:1 Elite (GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md) — questionario che
 * calcola il prezzo PRIMA della sottoscrizione. Il prezzo mostrato qui è
 * solo un'anteprima: `startEliteActivation` lo ricalcola server-side dalla
 * stessa selezione, non si fida di un numero mandato dal client.
 */
export function EliteQuestionnaire({ color }: { color: string }) {
  const [open, setOpen] = useState(false);
  const [allenamenti, setAllenamenti] = useState<WorkoutFrequency>(3);
  const [cadenza, setCadenza] = useState<CheckinCadence>("bimestrale");
  const [canale, setCanale] = useState<CheckinChannel>("remoto");
  const [periodo, setPeriodo] = useState<BillingPeriod>("mensile");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ background: color }}
        className="w-full rounded-lg py-2.5 text-sm font-bold text-white"
      >
        Calcola il tuo prezzo
      </button>
    );
  }

  const sel = { allenamenti, cadenza, canale };
  const monthly = eliteMonthlyPriceCents(sel);
  const total = eliteTotalPriceCents(sel, periodo);
  const season = eliteSeasonQuote(sel);

  return (
    <form action={startEliteActivation} className="flex flex-col gap-3 text-left">
      <div>
        <label className="t-label text-muted">Allenamenti a settimana</label>
        <select
          name="allenamenti"
          value={allenamenti}
          onChange={(e) => setAllenamenti(Number(e.target.value) as WorkoutFrequency)}
          className={selectClass}
        >
          {WORKOUT_FREQUENCIES.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="t-label text-muted">Check-in con il coach</label>
        <select
          name="cadenza"
          value={cadenza}
          onChange={(e) => setCadenza(e.target.value as CheckinCadence)}
          className={selectClass}
        >
          {CHECKIN_CADENCES.map((c) => (
            <option key={c} value={c}>
              {CHECKIN_CADENCE_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="t-label text-muted">Canale</label>
        <select
          name="canale"
          value={canale}
          onChange={(e) => setCanale(e.target.value as CheckinChannel)}
          className={selectClass}
        >
          {CHECKIN_CHANNELS.map((c) => (
            <option key={c} value={c}>
              {CHECKIN_CHANNEL_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="t-label text-muted">Fatturazione</label>
        <select
          name="periodo"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as BillingPeriod)}
          className={selectClass}
        >
          <option value="mensile">Ogni mese</option>
          <option value="bimestrale">Ogni 2 mesi</option>
        </select>
      </div>

      <div className="rounded-lg bg-background p-3 text-center">
        {periodo === "bimestrale" && (
          <p className="text-sm text-muted">{euro(monthly)}/mese equivalente</p>
        )}
        <p className="font-display text-xl text-foreground">
          {euro(total)} {periodo === "bimestrale" ? "ogni 2 mesi" : "/mese"}
        </p>
      </div>

      {/* TASK 7 (feedback 29/08): subito dopo il prezzo mensile, l'opzione
          di prepagare l'intera stagione con sconto — nello stesso flusso,
          non una pagina a parte. */}
      <div className="rounded-lg border border-dashed border-teal/40 bg-teal/5 p-3 text-center">
        <p className="text-sm text-muted">
          Oppure paga tutta la stagione ora — fino a fine giugno, {season.months} mesi
        </p>
        <p className="font-display text-lg text-foreground">
          {euro(season.discountedCents)}{" "}
          <span className="text-sm font-normal text-muted line-through">
            {euro(season.fullCents)}
          </span>
        </p>
        <p className="text-xs font-bold text-teal">Sconto 10% per pagamento anticipato</p>
      </div>

      <CheckoutConsent
        label="Richiedi attivazione"
        color={color}
        secondary={{ label: "Paga la stagione ora (-10%)", formAction: startEliteSeasonActivation }}
      />
    </form>
  );
}
