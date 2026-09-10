"use client";
// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { useTransition } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { togglePublish, deleteLibraryItem } from "./actions";

/** Pubblica/nascondi + elimina un contenuto libreria (coach). */
export function LibraryRowActions({
  id,
  published,
}: {
  id: string;
  published: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => togglePublish(id, !published))}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground disabled:opacity-50"
      >
        {published ? <EyeOff size={15} /> : <Eye size={15} />}
        {published ? "Nascondi" : "Pubblica"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Eliminare questo contenuto e il suo file?"))
            start(() => deleteLibraryItem(id));
        }}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-[#DC2626] disabled:opacity-50"
      >
        <Trash2 size={15} /> Elimina
      </button>
    </div>
  );
}
