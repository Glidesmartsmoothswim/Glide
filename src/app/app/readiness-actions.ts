"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { notifyCoaches } from "@/lib/notify";
import { L2_TEMPLATE } from "@/lib/readiness";
import { fullName } from "@/lib/types";

export type ReadinessState = { error?: string; info?: string; redFlag?: boolean };

const s5 = (v: FormDataEntryValue | null) =>
  Math.min(5, Math.max(1, Number(v ?? 0)));

/**
 * Check-in PRE (v2). Scale "5 = meglio": sonno/energia/corpo/umore/motivazione.
 * corpo <= 3 → sede del dolore obbligatoria. Chip petto/respiro/testa (ADR-004
 * L2) → salva red_flag, notifica il coach, mostra il template fisso. Nessun LLM.
 */
export async function savePre(
  _prev: ReadinessState,
  formData: FormData,
): Promise<ReadinessState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };

  const sleep = s5(formData.get("sleep"));
  const energia = s5(formData.get("energia"));
  const corpo = s5(formData.get("corpo"));
  const mood = s5(formData.get("mood"));
  const motivation = s5(formData.get("motivation"));
  if (!sleep || !energia || !corpo || !mood || !motivation)
    return { error: "Valuta tutte e cinque le voci da 1 a 5." };

  const redFlag = String(formData.get("red_flag") ?? "") === "true";
  const painSites = String(formData.get("pain_sites") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (corpo <= 3 && painSites.length === 0)
    return { error: "Il corpo fa male: dimmi dove (scegli almeno una zona)." };

  const supabase = await createClient();
  const { error } = await supabase.from("readiness").insert({
    swimmer_id: profile.id,
    phase: "pre",
    sleep,
    energia,
    corpo,
    mood,
    motivation,
    pain_sites: painSites.length ? painSites : null,
    health_flag: corpo <= 3 || redFlag,
    red_flag: redFlag,
  });
  if (error) return { error: error.message };

  if (redFlag) {
    // ADR-004 L2: notifica immediata al coach, template fisso al nuotatore.
    await notifyCoaches(
      "cert",
      "Segnale salute — attenzione",
      `${fullName(profile)} ha segnalato petto/respiro/testa. Contattalo.`,
    );
    revalidatePath("/app");
    return { info: L2_TEMPLATE, redFlag: true };
  }

  revalidatePath("/app");
  revalidatePath("/app/progressi");
  return { info: "Registrato. Alessio lo vede stasera." };
}

/**
 * Check-in POST: RPE 1–10 + "E adesso come stai?" (umore_post 1–5) + nota.
 * La nota NON entra mai nel ledger (ADR-004): solo has_note.
 */
export async function savePost(
  _prev: ReadinessState,
  formData: FormData,
): Promise<ReadinessState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };

  const rpe = Math.min(10, Math.max(1, Number(formData.get("rpe") ?? 0)));
  const umorePost = s5(formData.get("umore_post"));
  if (!rpe) return { error: "Indica lo sforzo percepito (RPE)." };
  if (!umorePost) return { error: "Dimmi come stai adesso (1–5)." };

  const supabase = await createClient();
  const { error } = await supabase.from("readiness").insert({
    swimmer_id: profile.id,
    phase: "post",
    rpe,
    umore_post: umorePost,
    note: String(formData.get("note") ?? "").trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/progressi");
  return { info: "Sessione registrata. Onda dopo onda." };
}
