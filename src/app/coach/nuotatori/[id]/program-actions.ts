"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { archiveProgramVideos } from "@/lib/retention";
import { validatePhases, type PhaseInput } from "@/lib/programs";

export type ProgState = { error?: string; info?: string; programId?: string };

const revalidate = (swimmerId: string) =>
  revalidatePath(`/coach/nuotatori/${swimmerId}`);

/** Crea un programma (draft). */
export async function createProgram(input: {
  swimmer_id: string;
  title: string;
  start_date: string;
  end_date: string;
  goal_race_name?: string | null;
  goal_race_date?: string | null;
  goal_race_pool?: number | null;
  goal_events?: string[] | null;
  goal_time_target?: string | null;
}): Promise<ProgState> {
  const coach = await requireRole("coach");
  if (!input.title.trim()) return { error: "Serve un titolo." };
  if (!input.start_date || !input.end_date)
    return { error: "Servono inizio e fine." };
  if (new Date(input.end_date) <= new Date(input.start_date))
    return { error: "La fine deve essere dopo l'inizio." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .insert({
      swimmer_id: input.swimmer_id,
      coach_id: coach.id,
      title: input.title.trim(),
      start_date: input.start_date,
      end_date: input.end_date,
      goal_race_name: input.goal_race_name || null,
      goal_race_date: input.goal_race_date || null,
      goal_race_pool: input.goal_race_pool || null,
      goal_events: input.goal_events?.length ? input.goal_events : null,
      goal_time_target: input.goal_time_target || null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidate(input.swimmer_id);
  return { info: "Programma creato (bozza).", programId: data?.id as string };
}

/** Sostituisce le fasi (validate: in sequenza, niente buchi/sovrapposizioni). */
export async function savePhases(
  programId: string,
  swimmerId: string,
  phases: PhaseInput[],
): Promise<ProgState> {
  await requireRole("coach");
  const supabase = await createClient();
  const { data: prog } = await supabase
    .from("programs")
    .select("start_date, end_date")
    .eq("id", programId)
    .single();
  if (!prog) return { error: "Programma non trovato." };

  const err = validatePhases(phases, prog);
  if (err) return { error: err };

  await supabase.from("program_phases").delete().eq("program_id", programId);
  if (phases.length) {
    const { error } = await supabase.from("program_phases").insert(
      phases.map((p) => ({
        program_id: programId,
        name: p.name.trim(),
        phase_type: p.phase_type,
        start_date: p.start_date,
        end_date: p.end_date,
        focus: p.focus || null,
      })),
    );
    if (error) return { error: error.message };
  }
  revalidate(swimmerId);
  return { info: "Fasi salvate." };
}

/** Note del coach (tabella separata, mai visibile al nuotatore). */
export async function saveProgramNotes(
  programId: string,
  swimmerId: string,
  notes: string,
): Promise<ProgState> {
  await requireRole("coach");
  const supabase = await createClient();
  const { error } = await supabase
    .from("program_notes")
    .upsert(
      { program_id: programId, notes, updated_at: new Date().toISOString() },
      { onConflict: "program_id" },
    );
  if (error) return { error: error.message };
  revalidate(swimmerId);
  return { info: "Note salvate." };
}

/** Attiva un programma (uno solo attivo per nuotatore — vincolo DB). */
export async function activateProgram(
  programId: string,
  swimmerId: string,
): Promise<ProgState> {
  await requireRole("coach");
  const supabase = await createClient();
  const { error } = await supabase
    .from("programs")
    .update({ status: "active" })
    .eq("id", programId);
  if (error) {
    if (/uniq_active_program/.test(error.message))
      return {
        error: "C'è già un programma attivo: chiudilo prima di attivarne un altro.",
      };
    return { error: error.message };
  }
  revalidate(swimmerId);
  return { info: "Programma attivato." };
}

/** Chiude il programma → archivia i video del programma (+90gg → purge). */
export async function closeProgram(
  programId: string,
  swimmerId: string,
): Promise<ProgState> {
  await requireRole("coach");
  const supabase = await createClient();
  const { error } = await supabase
    .from("programs")
    .update({ status: "closed" })
    .eq("id", programId);
  if (error) return { error: error.message };

  const n = await archiveProgramVideos(supabase, programId);
  revalidate(swimmerId);
  return { info: `Programma chiuso. ${n} video archiviati.` };
}

/** Duplica come base del prossimo ciclo (nuova bozza + fasi). */
export async function duplicateProgram(
  programId: string,
  swimmerId: string,
): Promise<ProgState> {
  const coach = await requireRole("coach");
  const supabase = await createClient();
  const { data: src } = await supabase
    .from("programs")
    .select("*")
    .eq("id", programId)
    .single();
  if (!src) return { error: "Programma non trovato." };

  const { data: nw, error } = await supabase
    .from("programs")
    .insert({
      swimmer_id: src.swimmer_id,
      coach_id: coach.id,
      title: `${src.title} (nuovo ciclo)`,
      start_date: src.start_date,
      end_date: src.end_date,
      goal_race_name: src.goal_race_name,
      goal_race_pool: src.goal_race_pool,
      goal_events: src.goal_events,
      goal_time_target: src.goal_time_target,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const { data: phases } = await supabase
    .from("program_phases")
    .select("name, phase_type, start_date, end_date, focus")
    .eq("program_id", programId);
  if (phases?.length) {
    await supabase.from("program_phases").insert(
      phases.map((p) => ({ ...p, program_id: nw!.id })),
    );
  }
  revalidate(swimmerId);
  return { info: "Duplicato come bozza.", programId: nw?.id as string };
}

/** Elimina un programma in bozza. */
export async function deleteProgram(
  programId: string,
  swimmerId: string,
): Promise<ProgState> {
  await requireRole("coach");
  const supabase = await createClient();
  const { error } = await supabase
    .from("programs")
    .delete()
    .eq("id", programId)
    .eq("status", "draft");
  if (error) return { error: error.message };
  revalidate(swimmerId);
  return { info: "Bozza eliminata." };
}
