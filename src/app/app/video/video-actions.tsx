"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Star, Trash2 } from "lucide-react";
import {
  softDeleteVideo,
  undoDeleteVideo,
  togglePreserve,
} from "./actions";

/** Azioni sul proprio video: elimina (con avviso), preserva ✦. */
export function VideoActions({
  videoId,
  hasAnalysis,
  birraPaid,
  preserved,
}: {
  videoId: string;
  hasAnalysis: boolean;
  birraPaid: boolean;
  preserved: boolean;
}) {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const warn = hasAnalysis
    ? "Il coach l'ha già commentato. Cancello il video; i commenti testuali restano nel tuo storico."
    : birraPaid
      ? "Hai pagato l'analisi di questo video. Cancellandolo non c'è rimborso."
      : "Elimino il video. Non si recupera.";

  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm">
      <button
        type="button"
        onClick={() =>
          start(async () => {
            const r = await togglePreserve(videoId);
            setMsg(r.error ?? r.info ?? null);
          })
        }
        disabled={pending}
        className={`inline-flex items-center gap-1 font-semibold ${
          preserved ? "text-blu" : "text-muted hover:text-foreground"
        }`}
      >
        <Star size={15} className={preserved ? "fill-blu" : ""} />
        {preserved ? "Preservato" : "Preserva"}
      </button>

      {!confirm ? (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className="ml-auto inline-flex items-center gap-1 text-muted hover:text-[#DC2626]"
        >
          <Trash2 size={15} /> Elimina
        </button>
      ) : (
        <div className="ml-auto flex flex-col items-end gap-2">
          <p className="max-w-xs text-right text-xs text-muted">{warn}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirm(false)}
              className="text-muted"
            >
              Annulla
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await softDeleteVideo(videoId);
                  setMsg(r.error ?? r.info ?? null);
                  setConfirm(false);
                })
              }
              className="rounded-lg bg-[#DC2626] px-3 py-1.5 font-semibold text-white disabled:opacity-60"
            >
              Elimina
            </button>
          </div>
        </div>
      )}

      {msg && <p className="w-full text-xs text-muted">{msg}</p>}
    </div>
  );
}

/** Barra "Annulla" per un video soft-deleted (entro 7 giorni). */
export function UndoDelete({ videoId }: { videoId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted">
        {msg ?? "Eliminato — si cancella tra 7 giorni."}
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await undoDeleteVideo(videoId);
            setMsg(r.error ?? null);
          })
        }
        className="inline-flex items-center gap-1 text-sm font-semibold text-blu disabled:opacity-60"
      >
        <RotateCcw size={15} /> Annulla
      </button>
    </div>
  );
}
