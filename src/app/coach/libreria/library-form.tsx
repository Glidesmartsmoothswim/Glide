"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createLibraryItem, type LibraryState } from "./actions";
import { TIER_LABEL, TIERS } from "@/lib/access";

const field =
  "rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blu";

async function uploadTo(bucket: string, file: File, prefix: string) {
  const supabase = createClient();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${prefix}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage
    .from(bucket)
    .upload(key, file, { upsert: false });
  if (error) throw new Error(error.message);
  return key;
}

/** Gestionale coach: nuovo contenuto libreria (upload su storage + salva). */
export function LibraryForm() {
  const router = useRouter();
  const [kind, setKind] = useState<"pdf" | "video" | "link">("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<LibraryState>({});

  async function onSubmit(formData: FormData) {
    setMsg({});
    setBusy(true);
    try {
      if (kind === "pdf") {
        if (!file) {
          setMsg({ error: "Scegli il file PDF." });
          return;
        }
        formData.set("file_key", await uploadTo("library", file, "pdf"));
      }
      if (cover) {
        formData.set("cover_key", await uploadTo("library", cover, "cover"));
      }
      const res = await createLibraryItem({}, formData);
      setMsg(res);
      if (!res.error) {
        setFile(null);
        setCover(null);
        router.refresh();
      }
    } catch (e) {
      setMsg({ error: e instanceof Error ? e.message : "Upload fallito." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-3">
      <input name="title" required placeholder="Titolo" className={field} />
      <textarea
        name="description"
        placeholder="Descrizione breve"
        rows={2}
        className={field}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Tipo
          <select
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as "pdf" | "video" | "link")}
            className={field}
          >
            <option value="pdf">PDF</option>
            <option value="video">Video (link)</option>
            <option value="link">Link</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Visibilità
          <select name="visibility" defaultValue="free" className={field}>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {TIER_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {kind === "pdf" ? (
        <label className="flex flex-col gap-1 text-xs text-muted">
          File PDF
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-white"
          />
        </label>
      ) : (
        <input
          name="url"
          placeholder="URL (https://…)"
          className={field}
        />
      )}

      <label className="flex flex-col gap-1 text-xs text-muted">
        Copertina (opzionale)
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCover(e.target.files?.[0] ?? null)}
          className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-white"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="published" value="true" defaultChecked />
        Pubblica subito
      </label>

      {msg.error && <p className="text-sm text-[#DC2626]">{msg.error}</p>}
      {msg.info && <p className="text-sm text-teal">{msg.info}</p>}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blu to-navy py-3 font-semibold text-white disabled:opacity-60"
      >
        <UploadCloud size={18} />
        {busy ? "Salvo…" : "Aggiungi alla libreria"}
      </button>
    </form>
  );
}
