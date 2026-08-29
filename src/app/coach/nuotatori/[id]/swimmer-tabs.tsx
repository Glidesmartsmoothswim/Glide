"use client";

import { useState, type ReactNode } from "react";

export const SWIMMER_TABS = [
  { key: "panoramica", label: "Panoramica" },
  { key: "programmazione", label: "Programmazione" },
  { key: "andamento", label: "Andamento" },
  { key: "video", label: "Video" },
  { key: "obiettivi", label: "Obiettivi & PB" },
  { key: "pagamenti", label: "Pagamenti" },
  { key: "note", label: "Note" },
] as const;
export type SwimmerTabKey = (typeof SWIMMER_TABS)[number]["key"];

/**
 * Sprint B (ADR-014/015) — tab sotto l'header sticky della scheda nuotatore,
 * fedele a GLIDE_mockup_scheda_nuotatore.html: colore/bordo per lo stato
 * attivo, MAI font-weight 500/600 su Glacial Indifference (ADR-009,
 * VINCOLO NON DEROGABILE) — solo 400 (inattiva) o 700 (attiva, peso reale).
 */
/**
 * `header` (avatar/nome/badge/alert, ADR-014) sta NELLO STESSO blocco
 * sticky delle tab — sempre visibili insieme, come nel mockup (header
 * top:0, tab subito sotto), senza dover calcolare un offset in px fragile.
 */
export function SwimmerTabs({
  header,
  panels,
  initial = "panoramica",
}: {
  header: ReactNode;
  panels: Record<SwimmerTabKey, ReactNode>;
  initial?: SwimmerTabKey;
}) {
  const [active, setActive] = useState<SwimmerTabKey>(initial);

  return (
    <>
      <div className="sticky top-0 z-20 -mx-4 bg-background px-4 lg:-mx-8 lg:px-8">
        {header}
        <nav className="flex gap-1 overflow-x-auto border-b border-border">
          {SWIMMER_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`relative shrink-0 whitespace-nowrap px-3 py-3 text-sm transition-colors ${
                active === t.key
                  ? "font-bold text-blu"
                  : "font-normal text-muted hover:text-foreground"
              }`}
            >
              {t.label}
              {active === t.key && (
                <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-t-full bg-blu" />
              )}
            </button>
          ))}
        </nav>
      </div>
      <div className="pt-5">{panels[active]}</div>
    </>
  );
}
