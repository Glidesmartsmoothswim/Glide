"use client";
// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerVideo } from "@/app/app/video/actions";
import {
  VIDEO_EXT_LABEL,
  VIDEO_MAX_BYTES,
  VIDEO_MAX_MB,
  videoContentType,
  videoFileError,
  videoMb,
} from "@/lib/video";
import {
  comprimiVideo,
  compressioneDisponibile,
  messaggioTroppoGrande,
} from "@/lib/video-compress";

const field =
  "rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blu";

export function VideoUploader() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ error?: string; info?: string }>({});
  /** Avanzamento della compressione (0–100). Null = non sta comprimendo.
   *  Serve perché la compressione è in tempo reale: senza, l'utente resta
   *  minuti davanti a un pulsante fermo e pensa che si sia piantato. */
  const [progresso, setProgresso] = useState<number | null>(null);

  async function onSubmit(formData: FormData) {
    setMsg({});
    setProgresso(null);
    if (!file) {
      setMsg({ error: "Scegli un file video." });
      return;
    }
    // Il formato si controlla SUBITO; la dimensione no, perché il file può
    // ancora dimagrire: rifiutarlo qui sarebbe rifiutare un video che dopo la
    // compressione sarebbe passato.
    if (!videoContentType(file.name, file.type)) {
      setMsg({
        error: `Formato non supportato. Carica un file video (${VIDEO_EXT_LABEL}).`,
      });
      return;
    }
    if (file.size <= 0) {
      setMsg({ error: "File vuoto o illeggibile." });
      return;
    }

    setBusy(true);
    try {
      // Comprime solo se serve (dentro `comprimiVideo`) e fallisce morbido:
      // se non ci riesce torna l'originale e decide il controllo qui sotto.
      let daCaricare = file;
      if (file.size > VIDEO_MAX_BYTES) {
        setMsg({ info: "Comprimo il video… ci vuole quanto dura la gara." });
        const esito = await comprimiVideo(file, {
          onProgress: (f) => setProgresso(Math.round(f * 100)),
        });
        setProgresso(null);
        if (esito.file.size > VIDEO_MAX_BYTES) {
          setMsg({ error: messaggioTroppoGrande(esito) });
          return;
        }
        daCaricare = esito.file;
        setMsg({
          info: esito.compresso
            ? `Compresso da ${videoMb(esito.bytesOriginali)} MB a ${videoMb(daCaricare.size)} MB. Carico…`
            : "Carico…",
        });
      }

      // Rete di sicurezza finale sul file che parte davvero.
      const invalid = videoFileError(daCaricare);
      if (invalid) {
        setMsg({ error: invalid });
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMsg({ error: "Sessione scaduta, rientra." });
        return;
      }
      const safe = daCaricare.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage
        .from("race-videos")
        .upload(path, daCaricare, {
          upsert: false,
          // Esplicito: se il browser non popola `File.type`, supabase-js
          // manderebbe un content-type non-video e il bucket lo rifiuterebbe.
          contentType:
            videoContentType(daCaricare.name, daCaricare.type) ?? undefined,
        });
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
      <label className="flex flex-col gap-1 text-sm text-muted">
        Data gara (facoltativa)
        <input type="date" name="race_date" className={field} />
      </label>
      <input
        type="file"
        accept="video/*"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setFile(f);
          setProgresso(null);
          // Un file grande NON è più un errore: si avvisa che verrà compresso.
          // L'errore, se serve, arriva dopo — quando si sa se è bastata.
          if (!f) return setMsg({});
          if (!videoContentType(f.name, f.type))
            return setMsg({
              error: `Formato non supportato. Carica un file video (${VIDEO_EXT_LABEL}).`,
            });
          if (f.size > VIDEO_MAX_BYTES)
            return setMsg({
              info: compressioneDisponibile()
                ? `${videoMb(f.size)} MB: lo comprimo prima di caricarlo.`
                : `${videoMb(f.size)} MB, oltre il limite di ${VIDEO_MAX_MB} MB — e questo browser non sa comprimere. Ritaglia la gara o rigirala a risoluzione più bassa.`,
            });
          setMsg({});
        }}
        className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-navy file:px-3 file:py-2 file:text-white"
      />
      <p className="text-xs text-muted">
        Massimo {VIDEO_MAX_MB} MB ({VIDEO_EXT_LABEL}). I video più pesanti
        vengono compressi qui sul telefono prima di partire: ci vuole quanto
        dura la gara, e l&apos;audio non viene conservato.
      </p>
      {msg.error && <p className="text-sm text-[#DC2626]">{msg.error}</p>}
      {msg.info && <p className="text-sm text-teal">{msg.info}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blu to-navy py-3 font-bold text-white disabled:opacity-60"
      >
        <UploadCloud size={18} />
        {progresso != null
          ? `Comprimo… ${progresso}%`
          : busy
            ? "Carico…"
            : "Carica video gara"}
      </button>
    </form>
  );
}
