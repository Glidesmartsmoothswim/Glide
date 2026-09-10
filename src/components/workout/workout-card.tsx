// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { ZONES, parseLine, blockMeters, type Block } from "@/lib/workout";
import type { WorkoutRow } from "@/lib/types";
import { Card, Pill } from "@/components/ui/card";

/** Elenco blocchi a zone + metri. Estratto da WorkoutCard per essere riusato
 * dall'editor self-service del nuotatore. */
export function BlockList({ blocks }: { blocks: Block[] }) {
  return (
    <div className="flex flex-col gap-2">
      {blocks.map((b, i) => {
        const note = b.note?.trim();
        return (
          <div
            key={i}
            className="rounded-xl bg-background p-3"
            style={{ borderLeft: `4px solid ${ZONES[b.z]?.color ?? "#ccc"}` }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">
                {b.rounds > 1 ? `${b.rounds}× ` : ""}
                {b.name || b.z}
              </span>
              <span className="text-sm text-muted">{blockMeters(b)} m</span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {b.lines
                .filter((l) => l.trim())
                .map((l, k) => {
                  const p = parseLine(l);
                  const z = p.zone ?? b.z;
                  return (
                    <li key={k} className="text-sm text-foreground/80">
                      <span
                        className="mr-1.5 inline-block rounded px-1 text-sm font-bold"
                        style={{
                          background: ZONES[z]?.tint,
                          color: ZONES[z]?.text,
                        }}
                      >
                        {z}
                      </span>
                      {l.trim()}
                    </li>
                  );
                })}
            </ul>
            {/* TASK 2 — la nota del coach: prosa, non sigle. Box distinto,
                corpo testo normale (mai monospace), sempre aperta: si legge a
                bordo vasca senza tap. Blocco senza nota → niente box, nessuno
                spazio riservato (i 51 blocchi storici renderizzano identici). */}
            {note && (
              <p className="mt-2 whitespace-pre-line rounded-lg border-l-2 border-blu/40 bg-surface px-3 py-2 text-sm leading-relaxed text-foreground/90">
                {note}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * TASK 4 — "Troppo o troppo poco?": le indicazioni scritte dal coach per
 * alleggerire o appesantire la seduta. Collassata (`<details>` nativo: niente
 * JS, funziona su Safari/iOS), in fondo all'allenamento. Nessun bottone che
 * applica alcunché: è testo, l'atleta decide e poi registra ciò che ha fatto.
 * Se nessuno dei due campi è valorizzato, la sezione non compare affatto.
 */
function ScaleHints({ down, up }: { down: string | null; up: string | null }) {
  const d = down?.trim();
  const u = up?.trim();
  if (!d && !u) return null;
  return (
    <details className="rounded-xl border border-border bg-background p-3">
      <summary className="cursor-pointer text-sm font-bold text-foreground">
        Troppo o troppo poco?
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        {d && (
          <div>
            <p className="text-sm font-bold text-foreground">Più leggero</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
              {d}
            </p>
          </div>
        )}
        {u && (
          <div>
            <p className="text-sm font-bold text-foreground">Più impegnativo</p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/80">
              {u}
            </p>
          </div>
        )}
      </div>
    </details>
  );
}

/** Visualizza un allenamento salvato (blocchi a zone + metri). */
export function WorkoutCard({ w }: { w: WorkoutRow }) {
  const blocks = Array.isArray(w.blocks) ? w.blocks : [];
  const updated =
    Boolean(w.updated_at) &&
    Boolean(w.published_at) &&
    new Date(w.updated_at as string).getTime() -
      new Date(w.published_at as string).getTime() >
      60_000;
  // TASK 5 — nel Canale Open il giorno non esiste più: l'atleta sceglie
  // quando svolgere la seduta in base alla propria disponibilità in vasca.
  // Le schede 'self'/'personal' continuano a mostrarlo.
  const showWeekDay = w.kind !== "open_channel" && Boolean(w.week_day);
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-foreground">{w.title}</h3>
          {w.focus && <p className="text-sm text-muted">{w.focus}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {updated && <Pill tone="brand">Aggiornato</Pill>}
          {showWeekDay && <Pill tone="brand">{w.week_day}</Pill>}
          <span className="text-sm text-muted">
            {(w.total_meters ?? 0).toLocaleString("it-IT")} m · {w.pool ?? 25} m
          </span>
        </div>
      </div>

      <BlockList blocks={blocks} />

      <ScaleHints down={w.scale_down ?? null} up={w.scale_up ?? null} />
    </Card>
  );
}
