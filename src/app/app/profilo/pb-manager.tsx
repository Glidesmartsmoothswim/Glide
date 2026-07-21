"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import {
  STILI,
  STILE_LABEL,
  VASCHE,
  distanzeValide,
  type Stile,
} from "@/lib/profile/costanti";
import { formatTempo, parseTempo } from "@/lib/profile/tempo";
import { upsertPersonalBest, deletePersonalBest } from "./actions";

const field =
  "rounded-lg border border-border bg-background px-2 py-2 text-sm outline-none focus:border-blu";

export type Pb = {
  id: string;
  distanza_m: number;
  stile: string;
  vasca: string;
  tempo_cc: number;
  data_conseguimento: string | null;
};

/**
 * Onda 16 — gestione personal best dell'INTERO programma gare individuale
 * (staffette escluse). Il selettore mostra solo distanze valide per lo stile
 * scelto (e la vasca): niente combinazioni inesistenti.
 */
export function PbManager({ items }: { items: Pb[] }) {
  const router = useRouter();
  const [stile, setStile] = useState<Stile>("SL");
  const [vasca, setVasca] = useState<string>("25");
  const distanze = distanzeValide(stile, vasca);
  const [dist, setDist] = useState<number>(distanze[0]);
  const [t, setT] = useState({ min: "", sec: "", cent: "" });
  const [data, setData] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const cc = parseTempo(t.min, t.sec, t.cent);

  // Se cambio stile/vasca e la distanza non è più valida, la riporto valida.
  function pickStile(s: Stile) {
    setStile(s);
    const d = distanzeValide(s, vasca);
    if (!d.includes(dist)) setDist(d[0]);
  }
  function pickVasca(v: string) {
    setVasca(v);
    const d = distanzeValide(stile, v);
    if (!d.includes(dist)) setDist(d[0]);
  }

  const sorted = [...items].sort(
    (a, b) =>
      STILI.indexOf(a.stile as Stile) - STILI.indexOf(b.stile as Stile) ||
      a.distanza_m - b.distanza_m ||
      a.vasca.localeCompare(b.vasca),
  );

  async function save() {
    setErr(null);
    if (cc === null) return setErr("Inserisci un tempo valido.");
    setBusy(true);
    const res = await upsertPersonalBest({
      distanza_m: dist,
      stile,
      vasca,
      tempo_cc: cc,
      data_conseguimento: data || null,
    });
    setBusy(false);
    if (res.error) return setErr(res.error);
    setT({ min: "", sec: "", cent: "" });
    setData("");
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    const res = await deletePersonalBest(id);
    setBusy(false);
    if (!res.error) router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {sorted.map((pb) => (
            <li
              key={pb.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-sm"
            >
              <span>
                <span className="font-semibold text-foreground">
                  {pb.distanza_m} {pb.stile}
                </span>{" "}
                <span className="text-muted">
                  vasca {pb.vasca} · {formatTempo(pb.tempo_cc)}
                </span>
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(pb.id)}
                aria-label="Rimuovi"
                className="text-muted hover:text-[#DC2626] disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3">
        <div className="grid grid-cols-3 gap-2">
          <select
            value={stile}
            onChange={(e) => pickStile(e.target.value as Stile)}
            className={field}
            aria-label="Stile"
          >
            {STILI.map((s) => (
              <option key={s} value={s}>
                {STILE_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            value={dist}
            onChange={(e) => setDist(Number(e.target.value))}
            className={field}
            aria-label="Distanza"
          >
            {distanze.map((d) => (
              <option key={d} value={d}>
                {d} m
              </option>
            ))}
          </select>
          <select
            value={vasca}
            onChange={(e) => pickVasca(e.target.value)}
            className={field}
            aria-label="Vasca"
          >
            {VASCHE.map((v) => (
              <option key={v} value={v}>
                Vasca {v}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              inputMode="numeric"
              placeholder="min"
              value={t.min}
              onChange={(e) => setT({ ...t, min: e.target.value })}
              className={`${field} w-16 text-center`}
            />
            <span className="text-muted">:</span>
            <input
              inputMode="numeric"
              placeholder="sec"
              value={t.sec}
              onChange={(e) => setT({ ...t, sec: e.target.value })}
              className={`${field} w-16 text-center`}
            />
            <span className="text-muted">.</span>
            <input
              inputMode="numeric"
              placeholder="cc"
              value={t.cent}
              onChange={(e) => setT({ ...t, cent: e.target.value })}
              className={`${field} w-16 text-center`}
            />
          </div>
          {cc !== null && (
            <span className="text-lg font-semibold text-foreground">
              {formatTempo(cc)}
            </span>
          )}
        </div>

        <label className="flex flex-col gap-1 text-xs text-muted">
          Data (facoltativa)
          <input
            type="date"
            max={today}
            value={data}
            onChange={(e) => setData(e.target.value)}
            className={field}
          />
        </label>

        {err && <p className="text-sm text-[#DC2626]">{err}</p>}
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blu to-navy py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          <Plus size={16} /> {busy ? "Salvo…" : "Salva tempo"}
        </button>
        <p className="text-xs text-muted">
          Programma individuale completo (staffette escluse). Salvare un tempo
          già presente lo aggiorna.
        </p>
      </div>
    </div>
  );
}
