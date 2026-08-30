"use client";

import { useState, useTransition } from "react";
import { Gift } from "lucide-react";
import { giftToken } from "./token-actions";
import type { TokenRedeemableFor } from "@/lib/tokens";

/** Pulsante "Regala token" con tipo + nota opzionale (coach, scheda nuotatore).
 *  Tipo: lezione privata o lezione di gruppo (ADR-015 Sprint C.1). */
export function GiftToken({ swimmerId }: { swimmerId: string }) {
  const [type, setType] = useState<TokenRedeemableFor>("private_lesson");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("private_lesson")}
          className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
            type === "private_lesson"
              ? "border-blu bg-blu/10 text-blu"
              : "border-border text-muted"
          }`}
        >
          Privata
        </button>
        <button
          type="button"
          onClick={() => setType("group_lesson")}
          className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
            type === "group_lesson"
              ? "border-blu bg-blu/10 text-blu"
              : "border-border text-muted"
          }`}
        >
          Gruppo
        </button>
      </div>
      <div className="flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (facoltativa)"
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-blu"
        />
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await giftToken(swimmerId, note, type);
              setMsg(res.info ?? res.error ?? null);
              if (res.info) setNote("");
            })
          }
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-blu to-navy px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Gift size={15} /> Regala token
        </button>
      </div>
      {msg && <p className="text-xs text-teal">{msg}</p>}
    </div>
  );
}
