"use client";

import { useState, useTransition } from "react";
import { CircleDollarSign } from "lucide-react";
import { Card, Pill } from "@/components/ui/card";
import { markSwimmerPaid } from "./payment-actions";
import type { GateState } from "@/lib/payment/gate";
import {
  TIER_LABEL,
  TIER_PRICE_CENTS,
  type SubTier,
} from "@/lib/payment/pricing";

const TIER_OPTIONS: SubTier[] = [
  "open",
  "open_plus",
  "one_to_one_monthly",
  "one_to_one_season",
];

const GATE_LABEL: Record<GateState, string> = {
  ok: "In regola",
  due: "Scade oggi",
  grace: "In grazia",
  overdue: "Scaduto",
};
const GATE_TONE: Record<GateState, "ok" | "warn" | "bad"> = {
  ok: "ok",
  due: "warn",
  grace: "warn",
  overdue: "bad",
};

const euro = (cents: number) => `€${(cents / 100).toFixed(2).replace(".00", "")}`;

/** ADR-014 — pannello "Pagamenti" scheda nuotatore: stato + Segna pagato. */
export function PaymentPanel({
  swimmerId,
  gate,
  daysOverdue,
  tierExpiresAt,
  requestedTier,
  requestedTierDetail,
  paymentStatus,
  paymentAmountCents,
  receiptNumber,
  paidAt,
}: {
  swimmerId: string;
  gate: GateState;
  daysOverdue: number;
  tierExpiresAt: string | null;
  requestedTier: SubTier | null;
  requestedTierDetail: string | null;
  paymentStatus: "pending_payment" | "paid" | null;
  paymentAmountCents: number | null;
  receiptNumber: string | null;
  paidAt: string | null;
}) {
  const [tier, setTier] = useState<SubTier | "">(requestedTier ?? "");
  const [amount, setAmount] = useState(
    requestedTier
      ? String((paymentAmountCents ?? TIER_PRICE_CENTS[requestedTier]) / 100)
      : "",
  );
  const [receipt, setReceipt] = useState("");
  // 1:1 Elite: quanti mesi copre l'incasso (default 1 = mensile).
  const [periodMonths, setPeriodMonths] = useState(1);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground">
          Scadenza:{" "}
          <span className="font-semibold">
            {tierExpiresAt
              ? new Date(tierExpiresAt).toLocaleDateString("it-IT")
              : "nessuna"}
          </span>
        </p>
        <Pill tone={GATE_TONE[gate]}>
          {GATE_LABEL[gate]}
          {(gate === "grace" || gate === "overdue") && ` · ${daysOverdue}gg`}
        </Pill>
      </div>

      {paymentStatus === "pending_payment" && requestedTier && (
        <p className="rounded-lg bg-blu/10 px-3 py-2 text-sm text-blu">
          Richiesta di attivazione {requestedTierDetail || TIER_LABEL[requestedTier]} ·{" "}
          {euro(paymentAmountCents ?? TIER_PRICE_CENTS[requestedTier])} — in
          attesa dell&apos;incasso.
        </p>
      )}

      {paidAt && (
        <p className="text-sm text-muted">
          Ultimo incasso: {new Date(paidAt).toLocaleDateString("it-IT")}
          {paymentAmountCents ? ` · ${euro(paymentAmountCents)}` : ""}
          {receiptNumber ? ` · ricevuta ${receiptNumber}` : ""}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <p className="t-label text-muted">Segna pagato</p>
        <div className="flex flex-wrap gap-2">
          <select
            value={tier}
            onChange={(e) => {
              const t = e.target.value as SubTier | "";
              setTier(t);
              if (t) setAmount(String(TIER_PRICE_CENTS[t] / 100));
            }}
            className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
          >
            <option value="">Piano…</option>
            {TIER_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t]}
              </option>
            ))}
          </select>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Importo €"
            inputMode="decimal"
            className="w-24 rounded-lg border border-border bg-background px-2 py-2 text-sm"
          />
          {/* 1:1 Elite fatturato mensile/bimestrale: quanti mesi copre
              l'incasso. Non per one_to_one_season (TASK 5, 01/09/2026): la
              stagione è SEMPRE 10 mesi fissi, mai una scelta del coach —
              markPaid la calcola da sola via expiryFor/seasonExpiryDate. */}
          {tier === "one_to_one_monthly" && (
            <select
              value={periodMonths}
              onChange={(e) => setPeriodMonths(Number(e.target.value))}
              title="Quanti mesi copre l'incasso (1:1 Elite, fatturazione mensile/bimestrale)"
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "mese" : "mesi"}
                </option>
              ))}
            </select>
          )}
          {tier === "one_to_one_season" && (
            <span className="self-center text-xs text-muted">
              Stagione fissa — 10 mesi, scadenza 31/08 anno successivo
            </span>
          )}
          <input
            value={receipt}
            onChange={(e) => setReceipt(e.target.value)}
            placeholder="N. ricevuta (facoltativo)"
            className="flex-1 min-w-[120px] rounded-lg border border-border bg-background px-2 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending || !tier}
            onClick={() =>
              start(async () => {
                const res = await markSwimmerPaid(swimmerId, {
                  tier,
                  amountEuro: amount,
                  receiptNumber: receipt,
                  periodMonths: tier === "one_to_one_monthly" ? periodMonths : undefined,
                });
                setMsg(res.info ?? res.error ?? null);
                if (res.info) setReceipt("");
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-blu to-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            <CircleDollarSign size={15} /> Segna pagato
          </button>
        </div>
        {msg && <p className="text-sm text-teal">{msg}</p>}
      </div>
    </Card>
  );
}
