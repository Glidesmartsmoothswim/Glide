"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import type { Block } from "@/lib/workout";

/**
 * Sprint C.4 (TASK 4) — "Modifica quello che hai fatto": editor leggero
 * post-sessione, solo rounds/zona per blocco (non il tool coach completo).
 * Per i casi in cui il nuotatore non ha finito l'allenamento o ha dovuto
 * cambiare qualcosa per forza maggiore. `modified` diventa true (e resta
 * true) alla prima modifica rispetto alla copia originale salvata al
 * completamento — è un indicatore di provenienza, non si azzera da solo.
 */
export async function saveCompletionEdit(
  completionId: string,
  blocks: Block[],
): Promise<{ error?: string; info?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("workout_completions")
    .select("id, swimmer_id, workout_id, blocks, modified")
    .eq("id", completionId)
    .single();
  if (!row || row.swimmer_id !== profile.id) return { error: "Non trovata." };

  const changed = JSON.stringify(row.blocks ?? []) !== JSON.stringify(blocks);
  const { error } = await supabase
    .from("workout_completions")
    .update({ blocks, modified: row.modified || changed })
    .eq("id", completionId);
  if (error) return { error: error.message };

  if (row.workout_id) revalidatePath(`/app/nuoto/${row.workout_id}`);
  revalidatePath("/app/nuoto");
  revalidatePath("/app/progressi");
  return { info: "Salvato." };
}
