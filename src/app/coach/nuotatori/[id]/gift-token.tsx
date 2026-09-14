"use client";
// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { useState, useTransition } from "react";
import { Gift } from "lucide-react";
import { giftToken } from "./token-actions";
import type { TokenRedeemableFor } from "@/lib/tokens";

/** Tipi regalabili e come si chiamano nella scheda del nuotatore. "Check-in"
 *  è il nome che il coach usa parlando con chi ha il percorso: la call è
 *  compresa nel pacchetto, e il token è il modo in cui gliela si dà. */
const TIPI: readonly { value: TokenRedeemableFor; label: string }[] = [
  { value: "private_lesson", label: "Privata" },
  { value: "group_lesson", label: "Gruppo" },
  { value: "call", label: "Check-in" },
];

/** Pulsante "Regala token" con tipo + nota opzionale (coach, scheda nuotatore).
 *  Tipo: lezione privata, di gruppo (ADR-015 Sprint C.1) o check-in da remoto
 *  (migration_064). */
export function GiftToken({ swimmerId }: { swimmerId: string }) {
  const [type, setType] = useState<TokenRedeemableFor>("private_lesson");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {TIPI.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={type === t.value}
            onClick={() => setType(t.value)}
            className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
              type === t.value
                ? "border-blu bg-blu/10 text-blu"
                : "border-border text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
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
