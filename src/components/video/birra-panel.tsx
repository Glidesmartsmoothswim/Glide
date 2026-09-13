// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { Beer, Check, Gift } from "lucide-react";
import { segnaBirraDovuta, chiudiBirra, offriBirra } from "@/app/coach/video/actions";
import { euro, type BirraTab } from "@/lib/birra";

/**
 * Colletta per la Birra, lato coach (A4.1).
 *
 * Tre azioni sole, e nessuna di queste blocca il video: segnarla dovuta,
 * chiuderla quando si incassa, oppure offrirla. Sta SOTTO al player di
 * proposito — il lavoro sul video viene prima, la colletta è una nota a
 * margine che si salda col rinnovo.
 */
export function BirraPanel({
  video,
  birra,
}: {
  video: { id: string; swimmer_id: string };
  birra?: BirraTab;
}) {
  if (!birra) {
    return (
      <form
        action={segnaBirraDovuta}
        className="flex items-center justify-between gap-3 rounded-xl bg-background p-3"
      >
        <input type="hidden" name="video_id" value={video.id} />
        <input type="hidden" name="swimmer_id" value={video.swimmer_id} />
        <p className="text-sm text-muted">
          Analisi non compresa nel piano — puoi segnare la colletta.
        </p>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#F59E0B] px-3 py-1.5 text-sm font-bold text-white"
        >
          <Beer size={14} /> Segna colletta
        </button>
      </form>
    );
  }

  if (birra.state === "pagata")
    return (
      <p className="flex items-center gap-1.5 rounded-xl bg-background p-3 text-sm text-muted">
        <Check size={14} className="text-verde" /> Colletta incassata ·{" "}
        {euro(birra.amount_cents)}
      </p>
    );

  if (birra.state === "offerta")
    return (
      <p className="flex items-center gap-1.5 rounded-xl bg-background p-3 text-sm text-muted">
        <Gift size={14} /> Offerta dal coach — nessun importo dovuto
      </p>
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-500/5 p-3">
      <p className="text-sm text-foreground">
        🍺 Colletta aperta · <b>{euro(birra.amount_cents)}</b> — si salda col
        rinnovo
      </p>
      <div className="flex items-center gap-2">
        <form action={chiudiBirra}>
          <input type="hidden" name="birra_id" value={birra.id} />
          <button
            type="submit"
            className="whitespace-nowrap rounded-lg bg-blu px-3 py-1.5 text-sm font-bold text-white"
          >
            Incassata
          </button>
        </form>
        <form action={offriBirra}>
          <input type="hidden" name="birra_id" value={birra.id} />
          <button
            type="submit"
            className="whitespace-nowrap text-sm text-muted underline hover:text-foreground"
          >
            Offro io
          </button>
        </form>
      </div>
    </div>
  );
}
