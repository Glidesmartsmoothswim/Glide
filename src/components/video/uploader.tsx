"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerVideo } from "@/app/app/video/actions";

const field =
  "rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blu";

export function VideoUploader() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; info?: string }>({});

  async function onSubmit(formData: FormData) {
    setMsg({});
    if (!file) {
      setMsg({ error: "Scegli un file video." });
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMsg({ error: "Sessione scaduta, rientra." });
        return;
      }
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("race-videos")
        .upload(path, file, { upsert: false });
      if (upErr) {
        setMsg({ error: "Upload fallito: " + upErr.message });
        return;
      }
      formData.set("storage_path", path);
      const res = await registerVideo({}, formData);
      setMsg(res);
      if (!res.error) {
        setFile(null);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-3">
      <input
        name="event"
        required
        placeholder="Gara (es. 50 SL — Regionali)"
        className={field}
      />
      <label className="flex flex-col gap-1 text-xs text-muted">
        Data gara (facoltativa)
        <input type="date" name="race_date" className={field} />
      </label>
      <input
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-white"
      />
      {msg.error && <p className="text-sm text-[#DC2626]">{msg.error}</p>}
      {msg.info && <p className="text-sm text-teal">{msg.info}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blu to-navy py-3 font-semibold text-white disabled:opacity-60"
      >
        <UploadCloud size={18} />
        {busy ? "Carico…" : "Carica video gara"}
      </button>
    </form>
  );
}
