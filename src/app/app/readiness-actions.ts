"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { notifyCoaches } from "@/lib/notify";
import { L2_TEMPLATE } from "@/lib/readiness";
import { mainSetSig, woMeters, blockMeters, type Block } from "@/lib/workout";
import { logEvent } from "@/lib/ledger";
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

  // Ledger (ADR-004): solo booleani/valori-scala, MAI le sedi del dolore.
  await logEvent(supabase, profile.id, "readiness.pre", {
    sleep,
    energia,
    corpo,
    umore: mood,
    motivazione: motivation,
    health_flag: corpo <= 3 || redFlag,
  });

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

  // Firma del set principale dall'allenamento indicato → curva di efficienza.
  // Se non c'è o non è riconoscibile: null e avanti (GLIDE_QUESTIONARIO §6).
  const workoutId = String(formData.get("workout_id") ?? "").trim() || null;
  let sig: string | null = null;
  let blocks: Block[] | null = null;
  let woMeta:
    | { title: string; focus: string | null; week_start: string | null; total_meters: number | null; kind: string }
    | null = null;
  if (workoutId) {
    const { data: w } = await supabase
      .from("workouts")
      .select("blocks, title, focus, week_start, total_meters, kind")
      .eq("id", workoutId)
      .single();
    if (w?.blocks) {
      blocks = w.blocks as Block[];
      sig = mainSetSig(blocks);
    }
    if (w)
      woMeta = {
        title: w.title as string,
        focus: (w.focus as string | null) ?? null,
        week_start: (w.week_start as string | null) ?? null,
        total_meters: (w.total_meters as number | null) ?? null,
        kind: w.kind as string,
      };
  }

  const note = String(formData.get("note") ?? "").trim() || null;
  const { error } = await supabase.from("readiness").insert({
    swimmer_id: profile.id,
    phase: "post",
    rpe,
    umore_post: umorePost,
    workout_id: workoutId,
    main_set_sig: sig,
    note,
  });
  if (error) return { error: error.message };

  // Ledger (ADR-004): la nota resta fuori, solo has_note.
  await logEvent(supabase, profile.id, "readiness.post", {
    rpe,
    umore_post: umorePost,
    has_note: Boolean(note),
    workout_id: workoutId,
  });
  // La seduta è "completata" quando il nuotatore chiude il post su un workout.
  if (workoutId && blocks) {
    const zones: Record<string, number> = {};
    for (const b of blocks) zones[b.z] = (zones[b.z] ?? 0) + blockMeters(b);
    await logEvent(supabase, profile.id, "workout.completed", {
      workout_id: workoutId,
      meters: woMeters(blocks),
      minutes: null,
      zones,
    });
  }

  // Onda 12.3: archivio personale svolti (self-contained: snapshot così
  // "resta mio" anche se l'allenamento sparisce o il tier scende a free).
  if (workoutId && woMeta) {
    await supabase.from("workout_completions").upsert(
      {
        swimmer_id: profile.id,
        workout_id: workoutId,
        title: woMeta.title,
        focus: woMeta.focus,
        week_start: woMeta.week_start,
        total_meters: woMeta.total_meters,
        source: woMeta.kind === "open_channel" ? "open_channel" : "personal",
        completed_at: new Date().toISOString(),
      },
      { onConflict: "swimmer_id,workout_id" },
    );
  }

  revalidatePath("/app");
  revalidatePath("/app/nuoto");
  revalidatePath("/app/progressi");
  return { info: "Sessione registrata. Onda dopo onda." };
}
