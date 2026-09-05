"use client";

import { useState, useTransition } from "react";
import { CircleDollarSign } from "lucide-react";
import { Card, Pill } from "@/components/ui/card";
import { markSwimmerPaid } from "./payment-actions";
import type { PaymentGate } from "@/lib/payment/status";
import {
  TIER_LABEL,
  TIER_PRICE_CENTS,
  expiryFor,
  type SubTier,
} from "@/lib/payment/pricing";

const TIER_OPTIONS: SubTier[] = [
  "open",
  "open_plus",
  "one_to_one_monthly",
  "one_to_one_season",
];

// ADR-016 — cinque stati, non più quattro. `due` è nuovo e non significa
// "scade oggi" come nel vecchio contratto: significa "non risulta pagato".
const GATE_LABEL: Record<PaymentGate, string> = {
  not_applicable: "Base (nessun abbonamento)",
  paid: "In regola",
  grace: "In grazia",
  overdue: "Scaduto",
  due: "Non risulta pagato",
};
const GATE_TONE: Record<PaymentGate, "ok" | "warn" | "bad"> = {
  not_applicable: "ok",
  paid: "ok",
  grace: "warn",
  overdue: "bad",
  due: "bad",
};

const euro = (cents: number) => `€${(cents / 100).toFixed(2).replace(".00", "")}`;

/** yyyy-mm-dd in ora locale (`toISOString` sposterebbe il giorno per il fuso). */
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Scadenza PROPOSTA dal form. Riusa `expiryFor` del listino invece di
 * rifarne il calcolo: così lo stagionale mantiene la regola
 * dell'iscrizione anticipata (luglio/agosto → 31/08 dell'anno successivo,
 * TASK 5) che una "+N mesi" scritta qui avrebbe silenziosamente perso.
 * Resta un default: il coach può sovrascriverla, ed è quel valore a vincere.
 */
function defaultExpiry(tier: SubTier | "", months: number): string {
  const now = new Date();
  if (!tier) return isoDay(now);
  // 1:1 Elite fatturato a più mesi: stessa aritmetica di markPaid.
  if (tier === "one_to_one_monthly" && months > 1)
    return isoDay(new Date(now.getFullYear(), now.getMonth() + months, now.getDate()));
  return isoDay(expiryFor(tier, now));
}

/** ADR-014 — pannello "Pagamenti" scheda nuotatore: stato + Segna pagato. */
export function PaymentPanel({
  swimmerId,
  gate,
  daysExpired,
  tierExpiresAt,
  requestedTier,
  requestedTierDetail,
  paymentStatus,
  paymentAmountCents,
  receiptNumber,
  paidAt,
}: {
  swimmerId: string;
  gate: PaymentGate;
  daysExpired: number;
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
  // ADR-016 Task 3 — scadenza OBBLIGATORIA. Il form ne propone una dal
  // listino (defaultExpiry) ma resta modificabile: le date reali sono
  // negoziate via email e possono divergere da `requested_tier_detail`.
  const [expiresAt, setExpiresAt] = useState(() =>
    defaultExpiry(requestedTier ?? "", 1),
  );
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

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
          {(gate === "grace" || gate === "overdue") && ` · ${daysExpired}gg`}
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
              if (t) {
                setAmount(String(TIER_PRICE_CENTS[t] / 100));
                setExpiresAt(defaultExpiry(t, periodMonths));
              }
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
              l'incasso. Non compare per one_to_one_season, che ha una
              scadenza di calendario e non un numero di mesi. Da ADR-016 Task
              3 questo select muove solo la data PROPOSTA nel campo qui
              accanto: la scadenza scritta a DB è sempre quella del campo. */}
          {tier === "one_to_one_monthly" && (
            <select
              value={periodMonths}
              onChange={(e) => {
                const n = Number(e.target.value);
                setPeriodMonths(n);
                setExpiresAt(defaultExpiry(tier, n));
              }}
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
          {/* ADR-016 Task 3 — la scadenza è OBBLIGATORIA: senza, il gate cade
              su `due` e il nuotatore resta bloccato pur avendo pagato. La
              data proposta è solo un default, perché quelle vere sono
              negoziate via email. */}
          <label className="flex items-center gap-1.5 text-sm">
            <span className="text-muted">Scade il</span>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              required
              aria-label="Data di scadenza del piano (obbligatoria)"
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
            />
          </label>
          <input
            value={receipt}
            onChange={(e) => setReceipt(e.target.value)}
            placeholder="N. ricevuta (facoltativo)"
            className="flex-1 min-w-[120px] rounded-lg border border-border bg-background px-2 py-2 text-sm"
          />
          <button
            type="button"
            disabled={pending || !tier || !expiresAt}
            onClick={() =>
              start(async () => {
                const res = await markSwimmerPaid(swimmerId, {
                  tier,
                  amountEuro: amount,
                  receiptNumber: receipt,
                  periodMonths: tier === "one_to_one_monthly" ? periodMonths : undefined,
                  expiresAt,
                });
                setMsg(res.info ?? res.error ?? null);
                setFailed(Boolean(res.error));
                if (res.info) setReceipt("");
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-blu to-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            <CircleDollarSign size={15} /> Segna pagato
          </button>
        </div>
        {/* Task 4 — l'errore del database si vede, e si vede che è un errore:
            prima ogni esito usciva in verde, indistinguibile da un successo. */}
        {msg && (
          <p className={`text-sm ${failed ? "text-[#DC2626]" : "text-teal"}`}>{msg}</p>
        )}
      </div>
    </Card>
  );
}
