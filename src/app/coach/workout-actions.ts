"use server";
// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { woMeters, type Block } from "@/lib/workout";
import { canEditWorkout } from "@/lib/config";
import { normalizeToMonday, currentMonday, weekDayOf } from "@/lib/week";
import type { WorkoutFormState } from "@/components/workout/editor";

function parseBlocks(raw: string): Block[] {
  try {
    const b = JSON.parse(raw);
    return Array.isArray(b) ? b : [];
  } catch {
    return [];
  }
}

/** Testo libero opzionale (note di scalatura): vuoto → null, mai stringa vuota. */
const optText = (v: FormDataEntryValue | null): string | null =>
  String(v ?? "").trim() || null;

/** Scheda personale 1:1 → workouts(kind='personal', swimmer_id). */
export async function savePersonalWorkout(
  _prev: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const coach = await requireRole("coach");
  const swimmerId = String(formData.get("swimmer_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!swimmerId) return { error: "Nuotatore mancante." };
  if (!title) return { error: "Serve un titolo." };

  const blocks = parseBlocks(String(formData.get("blocks") ?? "[]"));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      coach_id: coach.id,
      swimmer_id: swimmerId,
      kind: "personal",
      title,
      focus: String(formData.get("focus") ?? "").trim() || null,
      pool: Number(formData.get("pool") ?? 25),
      // Bugfix (feedback 29/08): l'editor "personal" non ha un selettore
      // giorno/settimana (è per un singolo nuotatore, non per il Canale
      // Open) — senza questi due campi "La tua Settimana" lato nuotatore
      // non trova mai la scheda. Popolati alla pubblicazione, come
      // open_channel fa col suo default quando il form non li manda.
      week_start: currentMonday(),
      week_day: weekDayOf(),
      blocks,
      total_meters: woMeters(blocks),
      scale_down: optText(formData.get("scale_down")),
      scale_up: optText(formData.get("scale_up")),
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath(`/coach/nuotatori/${swimmerId}`);
  return { info: "Salvato in scheda.", workoutId: data?.id as string };
}

/** Canale Open → workouts(kind='open_channel', visibile a tutti gli Open). */
export async function saveOpenWorkout(
  _prev: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const coach = await requireRole("coach");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Serve un titolo." };

  const blocks = parseBlocks(String(formData.get("blocks") ?? "[]"));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workouts")
    .insert({
      coach_id: coach.id,
      swimmer_id: null,
      kind: "open_channel",
      title,
      focus: String(formData.get("focus") ?? "").trim() || null,
      pool: Number(formData.get("pool") ?? 25),
      // PROMPT_CODE_ALLENAMENTI_OPEN TASK 5: nel Canale Open il giorno non si
      // assegna più — l'atleta sceglie quando svolgere la seduta in base alla
      // propria disponibilità in vasca. La colonna resta (la usa kind='self'),
      // ma qui non si popola: nuovi insert → null.
      week_day: null,
      // Onda 12.3: settimana di pubblicazione (default: settimana corrente).
      week_start:
        normalizeToMonday(String(formData.get("week_start") ?? "")) ??
        currentMonday(),
      blocks,
      total_meters: woMeters(blocks),
      scale_down: optText(formData.get("scale_down")),
      scale_up: optText(formData.get("scale_up")),
      published_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/coach/open");
  revalidatePath("/app/nuoto");
  return { info: "Pubblicato sul Canale Open.", workoutId: data?.id as string };
}

/**
 * Modifica di un allenamento pubblicato ENTRO la finestra (14 giorni).
 * La stessa finestra è imposta anche lato server: oltre → rifiuto.
 */
export async function updateWorkout(
  _prev: WorkoutFormState,
  formData: FormData,
): Promise<WorkoutFormState> {
  const coach = await requireRole("coach");
  const id = String(formData.get("workout_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!id) return { error: "Allenamento mancante." };
  if (!title) return { error: "Serve un titolo." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("workouts")
    .select("published_at, created_at, kind, swimmer_id")
    .eq("id", id)
    .eq("coach_id", coach.id)
    .single();
  if (!existing) return { error: "Allenamento non trovato." };
  if (!canEditWorkout(existing.published_at, existing.created_at))
    return {
      error: "Non più modificabile (oltre 14 giorni dalla pubblicazione).",
    };

  const blocks = parseBlocks(String(formData.get("blocks") ?? "[]"));
  const patch: Record<string, unknown> = {
    title,
    focus: String(formData.get("focus") ?? "").trim() || null,
    pool: Number(formData.get("pool") ?? 25),
    blocks,
    total_meters: woMeters(blocks),
    scale_down: optText(formData.get("scale_down")),
    scale_up: optText(formData.get("scale_up")),
    updated_at: new Date().toISOString(),
  };
  // TASK 5 — niente week_day sul Canale Open: l'editor non lo manda più e la
  // modifica non lo tocca. Sui record storici il valore resta com'è (nessun
  // backfill), semplicemente non viene più mostrato.
  if (existing.kind === "open_channel" && formData.get("week_start"))
    patch.week_start = normalizeToMonday(String(formData.get("week_start")));

  const { error } = await supabase
    .from("workouts")
    .update(patch)
    .eq("id", id)
    .eq("coach_id", coach.id);
  if (error) return { error: error.message };

  if (existing.swimmer_id)
    revalidatePath(`/coach/nuotatori/${existing.swimmer_id}`);
  revalidatePath("/coach/open");
  revalidatePath("/app/nuoto");
  return { info: "Allenamento aggiornato.", workoutId: id };
}
