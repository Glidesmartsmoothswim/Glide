"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerCertificate, type CertActionState } from "./certificate-actions";

const field =
  "rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blu";
const MAX_BYTES = 2 * 1024 * 1024;

/** Comprime un'immagine oltre ~2MB via canvas (JPEG). PDF invariati. */
async function maybeCompress(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= MAX_BYTES) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, w, h);
  const blob: Blob | null = await new Promise((res) =>
    canvas.toBlob((b) => res(b), "image/jpeg", 0.7),
  );
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}

/** Upload certificato medico (Profilo atleta). Fotocamera o galleria o PDF. */
export function CertificateUploader() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<CertActionState>({});

  async function onSubmit(formData: FormData) {
    setMsg({});
    if (!file) {
      setMsg({ error: "Scegli o scatta la foto del certificato." });
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
      const compressed = await maybeCompress(file);
      const ext = compressed.name.split(".").pop() || "bin";
      const key = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("medical")
        .upload(key, compressed, { upsert: false });
      if (upErr) {
        setMsg({ error: "Upload fallito: " + upErr.message });
        return;
      }
      formData.set("file_key", key);
      formData.set("mime_type", compressed.type);
      const res = await registerCertificate({}, formData);
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
      <label className="flex flex-col gap-1 text-xs text-muted">
        Scadenza *
        <input type="date" name="data_scadenza" required className={field} />
      </label>
      <input
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-white"
      />
      <input name="note" placeholder="Nota (facoltativa)" className={field} />
      {msg.error && <p className="text-sm text-[#DC2626]">{msg.error}</p>}
      {msg.info && <p className="text-sm text-teal">{msg.info}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blu to-navy py-3 font-semibold text-white disabled:opacity-60"
      >
        <ShieldPlus size={18} />
        {busy ? "Carico…" : "Carica certificato"}
      </button>
      <p className="text-xs text-muted">
        Documento sanitario: resta privato, visibile solo a te e al tuo coach.
      </p>
    </form>
  );
}
