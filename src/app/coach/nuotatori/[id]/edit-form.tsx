"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateSwimmer, type SwimmerActionState } from "../actions";
import type { SwimmerRow } from "@/lib/types";

function Save() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-gradient-to-br from-blu to-navy px-5 py-2.5 font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Salvo…" : "Salva scheda"}
    </button>
  );
}

const field =
  "rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu";

export function EditSwimmerForm({ s }: { s: SwimmerRow }) {
  const [state, action] = useActionState(updateSwimmer, {} as SwimmerActionState);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={s.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="first_name" defaultValue={s.first_name ?? ""} placeholder="Nome" className={field} />
        <input name="last_name" defaultValue={s.last_name ?? ""} placeholder="Cognome" className={field} />
        <input name="phone" defaultValue={s.phone ?? ""} placeholder="Telefono" className={field} />
        <input name="level" defaultValue={s.level ?? ""} placeholder="Livello (es. Master)" className={field} />
        <select name="service_type" defaultValue={s.service_type} className={field}>
          <option value="open">Open</option>
          <option value="coaching_1_1">1:1</option>
          <option value="both">1:1 + Open</option>
        </select>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Tier di accesso
          <select name="tier" defaultValue={s.tier ?? "free"} className={field}>
            <option value="free">Free</option>
            <option value="open">Open</option>
            <option value="open_plus">Open+</option>
            <option value="one_to_one">1:1 (dedicato)</option>
          </select>
        </label>
        <input name="package" defaultValue={s.package ?? ""} placeholder="Pacchetto (es. Elite €129)" className={field} />
        <select name="status" defaultValue={s.status} className={field}>
          <option value="attivo">Attivo</option>
          <option value="in_pausa">In pausa</option>
          <option value="scaduto">Scaduto</option>
        </select>
        <select name="cert_status" defaultValue={s.cert_status} className={field}>
          <option value="valido">Certificato valido</option>
          <option value="in_scadenza">Certificato in scadenza</option>
          <option value="assente">Certificato assente</option>
        </select>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Scadenza certificato
          <input type="date" name="cert_expiry" defaultValue={s.cert_expiry ?? ""} className={field} />
        </label>
      </div>

      {state.error && <p className="text-sm text-[#DC2626]">{state.error}</p>}
      {state.info && <p className="text-sm text-teal">{state.info}</p>}

      <div className="flex justify-end">
        <Save />
      </div>
    </form>
  );
}
