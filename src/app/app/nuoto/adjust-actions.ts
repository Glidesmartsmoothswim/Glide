"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { logEvent } from "@/lib/ledger";
import type { AdjustDirection } from "@/lib/workout";

/**
 * Onda 27.3 — registra la scelta di personalizzazione di un allenamento Open
 * (riduci/standard/aumenta). Solo ledger: nessuna scheda viene modificata,
 * è il nuotatore che sceglie come guardarla. Fail-soft (logEvent già lo è).
 */
export async function logWorkoutAdjustment(
  workoutId: string,
  direction: AdjustDirection,
): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const supabase = await createClient();
  await logEvent(supabase, profile.id, "workout.adjusted", {
    workout_id: workoutId,
    direction,
  });
}
