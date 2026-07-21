"use client";

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
