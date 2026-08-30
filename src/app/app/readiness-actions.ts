"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { mainSetSig, woMeters, blockMeters, type Block } from "@/lib/workout";
import { logEvent } from "@/lib/ledger";

export type ReadinessState = { error?: string; info?: string };

const s5 = (v: FormDataEntryValue | null) =>
  Math.min(5, Math.max(1, Number(v ?? 0)));

/**
 * Check-in PRE (v3 / ADR-013). Scale "5 = meglio": sonno/energia/umore/
 * motivazione. Il blocco dolore strutturato (corpo, sede, chip red flag) è
 * stato rimosso: dolore e sintomi si segnalano in chat o nella nota post
 * seduta, dove il matcher L1/L2 di ADR-004 (testo libero) resta invariato.
 */
export async function savePre(
  _prev: ReadinessState,
  formData: FormData,
): Promise<ReadinessState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };

  const sleep = s5(formData.get("sleep"));
  const energia = s5(formData.get("energia"));
  const mood = s5(formData.get("mood"));
  const motivation = s5(formData.get("motivation"));
  if (!sleep || !energia || !mood || !motivation)
    return { error: "Valuta tutte e quattro le voci da 1 a 5." };

  const supabase = await createClient();
  const { error } = await supabase.from("readiness").insert({
    swimmer_id: profile.id,
    phase: "pre",
    sleep,
    energia,
    mood,
    motivation,
  });
  if (error) return { error: error.message };

  // Ledger (ADR-004): solo valori-scala, MAI testo libero.
  await logEvent(supabase, profile.id, "readiness.pre", {
    sleep,
    energia,
    umore: mood,
    motivazione: motivation,
  });

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
  // Sprint C.4 (TASK 4): copia anche `blocks` (Svolto) — stesso pattern di
  // title/focus/total_meters. `modified` non è nel payload: se la riga
  // esiste già (upsert su conflitto), resta quella salvata dall'editor
  // "Modifica quello che hai fatto", non viene azzerata qui.
  if (workoutId && woMeta) {
    await supabase.from("workout_completions").upsert(
      {
        swimmer_id: profile.id,
        workout_id: workoutId,
        title: woMeta.title,
        focus: woMeta.focus,
        week_start: woMeta.week_start,
        total_meters: woMeta.total_meters,
        blocks: blocks ?? [],
        // ADR-012 (Onda 29.5): il self-service NON conta come aderenza al
        // programma — source proprio, escluso dalle query "open_channel"
        // che alimentano le statistiche del coach (/coach/open, /coach/social).
        source:
          woMeta.kind === "open_channel"
            ? "open_channel"
            : woMeta.kind === "self"
              ? "self"
              : "personal",
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
