"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { ZONES, blockMeters, type Block, type ZoneId } from "@/lib/workout";
import { saveCompletionEdit } from "./completion-actions";

const ZONE_IDS = Object.keys(ZONES) as ZoneId[];

/** Editor leggero "Modifica quello che hai fatto" (Sprint C.4, TASK 4):
 *  solo rounds e zona per blocco — non il tool coach completo. Per i casi
 *  in cui il nuotatore non ha finito l'allenamento o ha dovuto cambiare
 *  qualcosa per forza maggiore. */
export function CompletionEditor({
  completionId,
  blocks: initial,
  modified,
}: {
  completionId: string;
  blocks: Block[];
  modified: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  if (!initial.length) return null;

  function setBlock(i: number, patch: Partial<Block>) {
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  return (
    <div className="border-t border-border pt-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-blu"
        >
          <Pencil size={14} /> Modifica quello che hai fatto
          {modified && <span className="text-muted font-normal">(modificato)</span>}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Non hai finito l&apos;allenamento o hai dovuto cambiare qualcosa?
            Correggi rounds e zona per blocco.
          </p>
          {blocks.map((b, i) => (
            <div key={i} className="rounded-xl border border-border p-3">
              <p className="mb-2 text-sm font-bold text-foreground">
                {b.name || `Blocco ${i + 1}`}
              </p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted">Round</span>
                  <input
                    type="number"
                    min={0}
                    value={b.rounds}
                    onChange={(e) =>
                      setBlock(i, { rounds: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-center outline-none focus:border-blu"
                  />
                </label>
                <div className="flex flex-wrap gap-1">
                  {ZONE_IDS.map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setBlock(i, { z })}
                      className="rounded-full px-2 py-1 text-xs font-bold"
                      style={{
                        background: b.z === z ? ZONES[z].color : ZONES[z].tint,
                        color: b.z === z ? ZONES[z].text : ZONES[z].text,
                        outline: b.z === z ? `2px solid ${ZONES[z].color}` : "none",
                      }}
                    >
                      {z}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-xs text-muted">{blockMeters(b)} m</p>
            </div>
          ))}
          {msg && <p className="text-xs text-teal">{msg}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await saveCompletionEdit(completionId, blocks);
                  setMsg(res.info ?? res.error ?? null);
                  if (res.info) setOpen(false);
                })
              }
              className="rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {pending ? "Salvo…" : "Salva"}
            </button>
            <button
              type="button"
              onClick={() => {
                setBlocks(initial);
                setOpen(false);
                setMsg(null);
              }}
              className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-ink"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
