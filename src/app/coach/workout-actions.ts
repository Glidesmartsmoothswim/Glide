"use server";
// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { sanitizeBlocks, woMeters, type Block } from "@/lib/workout";
import { canEditWorkout } from "@/lib/config";
import { normalizeToMonday, currentMonday, weekDayOf } from "@/lib/week";
import type { WorkoutRow } from "@/lib/types";
import type { WorkoutFormState } from "@/components/workout/editor";

function parseBlocks(raw: string): Block[] {
  try {
    return sanitizeBlocks(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * Metri della seduta. Di regola li ricalcola il parser dai blocchi; il form
 * manda `total_meters_manual` SOLO quando il coach ha corretto il totale a
 * mano, perché su quella seduta il parser non ci arriva (distanza non a
 * inizio riga — "Risc 200 m" — o righe di continuazione).
 */
function metersFrom(formData: FormData, blocks: Block[]): number {
  const manual = Number(formData.get("total_meters_manual"));
  if (Number.isFinite(manual) && manual > 0) return Math.round(manual);
  return woMeters(blocks);
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
      total_meters: metersFrom(formData, blocks),
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
      total_meters: metersFrom(formData, blocks),
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
 * Modifica di un allenamento pubblicato ENTRO la finestra (14 giorni), o di
 * una BOZZA (published_at null), che non ha finestra perché non l'ha ancora
 * letta nessuno. La finestra è imposta anche lato server: oltre → rifiuto.
 *
 * È anche il punto in cui una bozza diventa pubblica: il form manda
 * `publish=1` quando il coach preme "Pubblica", e solo allora si scrive
 * `published_at` — e, sul Canale Open, la settimana senza la quale la seduta
 * non arriverebbe comunque a nessuno.
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
    total_meters: metersFrom(formData, blocks),
    scale_down: optText(formData.get("scale_down")),
    scale_up: optText(formData.get("scale_up")),
    updated_at: new Date().toISOString(),
  };
  // TASK 5 — niente week_day sul Canale Open: l'editor non lo manda più e la
  // modifica non lo tocca. Sui record storici il valore resta com'è (nessun
  // backfill), semplicemente non viene più mostrato.
  const isDraft = !existing.published_at;
  const wantsPublish = String(formData.get("publish") ?? "") === "1";
  const rawWeek = String(formData.get("week_start") ?? "").trim();
  const week = normalizeToMonday(rawWeek);

  if (existing.kind === "open_channel") {
    if (isDraft) {
      // Su una bozza la settimana si può anche togliere: campo vuoto → NULL,
      // e la seduta torna fuori dal raggio di currentMonday().
      patch.week_start = week;
    } else if (rawWeek) {
      patch.week_start = week;
    }
  }

  if (isDraft && wantsPublish) {
    if (existing.kind === "open_channel" && !week)
      return {
        error: "Per pubblicare sul Canale Open serve la settimana (lunedì).",
      };
    if (existing.kind === "personal") {
      // L'editor "personal" non ha il selettore settimana: alla pubblicazione
      // si popola come fa savePersonalWorkout, altrimenti "La tua Settimana"
      // lato nuotatore non trova mai la scheda.
      patch.week_start = currentMonday();
      patch.week_day = weekDayOf();
    }
    patch.published_at = new Date().toISOString();
  }

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
  return {
    info:
      isDraft && wantsPublish
        ? "Pubblicato."
        : isDraft
          ? "Bozza salvata. Non la vede ancora nessuno."
          : "Allenamento aggiornato.",
    workoutId: id,
  };
}

export type DuplicateState = { error?: string; copy?: WorkoutRow };

/**
 * Duplica una seduta esistente come BOZZA.
 *
 * La copia nasce senza settimana e senza `published_at`. Serve tutt'e due:
 * `week_start` NULL la tiene fuori dalla query della settimana corrente lato
 * atleta, `published_at` NULL la tiene fuori dall'archivio Open+, dalla home
 * e dal dettaglio — che la settimana non la guardano affatto. La RLS di
 * `workouts` lascia leggere a un Open+ qualunque riga open_channel, bozza
 * compresa: il filtro è nostro e sta nelle query, non nel database.
 *
 * Non copia: id, week_start, week_day, published_at, e lo swimmer_id se la
 * seduta non è personale (una copia Open non eredita il destinatario).
 */
export async function duplicateWorkout(id: string): Promise<DuplicateState> {
  const coach = await requireRole("coach");
  if (!id) return { error: "Allenamento mancante." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", id)
    .eq("coach_id", coach.id)
    .maybeSingle();
  if (!data) return { error: "Allenamento non trovato." };
  const source = data as WorkoutRow;
  if (source.kind !== "open_channel" && source.kind !== "personal")
    return { error: "Si duplicano solo le sedute scritte dal coach." };

  const blocks = sanitizeBlocks(source.blocks);
  // Il ricalcolo dai blocchi è la regola, ma su alcune sedute non torna:
  // la distanza non sta a inizio riga ("Risc 200 m") o ci sono righe di
  // continuazione. Lì vince il totale dell'originale, che è il numero che il
  // coach ha visto e approvato — e resta correggibile a mano nell'editor.
  const recomputed = woMeters(blocks);
  const meters =
    source.total_meters != null && source.total_meters !== recomputed
      ? source.total_meters
      : recomputed;

  const { data: created, error } = await supabase
    .from("workouts")
    .insert({
      coach_id: coach.id,
      swimmer_id: source.kind === "personal" ? source.swimmer_id : null,
      kind: source.kind,
      title: `${source.title} (copia)`,
      focus: source.focus,
      pool: source.pool ?? 25,
      week_day: null,
      week_start: null,
      blocks,
      total_meters: meters,
      scale_down: source.scale_down,
      scale_up: source.scale_up,
      published_at: null,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };

  return { copy: created as WorkoutRow };
}
