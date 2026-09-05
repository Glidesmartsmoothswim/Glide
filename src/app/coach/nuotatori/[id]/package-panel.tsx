"use client";

import { useState, useTransition } from "react";
import { PackageOpen } from "lucide-react";
import { Card, Pill } from "@/components/ui/card";
import { markPackagePaid } from "./package-actions";

const euro = (cents: number) =>
  `€ ${(cents / 100).toLocaleString("it-IT", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

export type PurchaseRow = {
  id: string;
  quantity: number;
  amount_cents: number;
  status: "pending_payment" | "paid" | "cancelled";
  requested_at: string;
  paid_at: string | null;
  receipt_number: string | null;
};

/**
 * ADR-016 — ordini pacchetto del nuotatore. Il documento chiede di mostrare
 * il saldo token accanto all'ordine, così il coach verifica a colpo d'occhio
 * che l'emissione sia avvenuta davvero dopo la marcatura.
 */
export function PackagePanel({
  swimmerId,
  purchases,
  tokenBalance,
}: {
  swimmerId: string;
  purchases: PurchaseRow[];
  tokenBalance: number;
}) {
  const [receipt, setReceipt] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  if (purchases.length === 0)
    return (
      <Card className="text-sm text-muted">
        Nessun pacchetto acquistato. Saldo token disponibili:{" "}
        <span className="font-semibold text-foreground">{tokenBalance}</span>.
      </Card>
    );

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground">
          Token disponibili:{" "}
          <span className="font-semibold">{tokenBalance}</span>
        </p>
        <PackageOpen size={16} className="text-muted" />
      </div>

      <ul className="flex flex-col divide-y divide-border">
        {purchases.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {p.quantity} lezioni · {euro(p.amount_cents)}
                </p>
                <p className="text-xs text-muted">
                  Richiesto il{" "}
                  {new Date(p.requested_at).toLocaleDateString("it-IT")}
                  {p.paid_at
                    ? ` · incassato il ${new Date(p.paid_at).toLocaleDateString("it-IT")}`
                    : ""}
                  {p.receipt_number ? ` · ricevuta ${p.receipt_number}` : ""}
                </p>
              </div>
              <Pill tone={p.status === "paid" ? "ok" : "warn"}>
                {p.status === "paid" ? "Incassato" : "Da incassare"}
              </Pill>
            </div>

            {p.status === "pending_payment" && (
              <div className="flex flex-wrap gap-2">
                <input
                  value={receipt}
                  onChange={(e) => setReceipt(e.target.value)}
                  placeholder="N. ricevuta (facoltativo)"
                  className="flex-1 min-w-[120px] rounded-lg border border-border bg-background px-2 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await markPackagePaid(swimmerId, p.id, receipt);
                      setMsg(res.info ?? res.error ?? null);
                      setFailed(Boolean(res.error));
                      if (res.info) setReceipt("");
                    })
                  }
                  className="rounded-lg bg-gradient-to-br from-blu to-navy px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  Segna pagato
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {msg && (
        <p className={`text-sm ${failed ? "text-[#DC2626]" : "text-teal"}`}>{msg}</p>
      )}
    </Card>
  );
}
