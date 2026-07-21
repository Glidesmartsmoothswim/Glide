"use client";

import { useState, useTransition } from "react";
import { Gift } from "lucide-react";
import { giftToken } from "./token-actions";

/** Pulsante "Regala token" con nota opzionale (coach, scheda nuotatore). */
export function GiftToken({ swimmerId }: { swimmerId: string }) {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
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
              const res = await giftToken(swimmerId, note);
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
