"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldPlus } from "lucide-react";
import { registerCertificate, type CertActionState } from "./certificate-actions";

const field =
  "rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blu";

/**
 * Autodichiarazione certificato medico (Onda 26 · minimizzazione GDPR).
 * L'atleta indica SOLO la scadenza e dichiara di possedere un certificato
 * valido: nessun file viene caricato né conservato.
 */
export function CertificateDeclaration() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<CertActionState>({});

  async function onSubmit(formData: FormData) {
    setMsg({});
    setBusy(true);
    try {
      const res = await registerCertificate({}, formData);
      setMsg(res);
      if (!res.error) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm text-muted">
        Scadenza *
        <input type="date" name="data_scadenza" required className={field} />
      </label>
      <label className="flex items-start gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="dichiarato"
          required
          className="mt-1 h-4 w-4 shrink-0"
        />
        <span>
          Dichiaro di possedere un certificato medico valido fino alla data
          indicata e di poterlo esibire su richiesta.
        </span>
      </label>
      <input name="note" placeholder="Nota (facoltativa)" className={field} />
      {msg.error && <p className="text-sm text-[#DC2626]">{msg.error}</p>}
      {msg.info && <p className="text-sm text-teal">{msg.info}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blu to-navy py-3 font-bold text-white disabled:opacity-60"
      >
        <ShieldPlus size={18} />
        {busy ? "Registro…" : "Registra scadenza"}
      </button>
      <p className="text-sm text-muted">
        Non conserviamo il documento: registriamo solo la scadenza e la tua
        dichiarazione. Tieni il certificato con te.
      </p>
    </form>
  );
}
