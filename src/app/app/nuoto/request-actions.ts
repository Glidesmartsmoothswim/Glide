"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { fullName } from "@/lib/types";
import { notifyCoaches } from "@/lib/notify";
import { logEvent } from "@/lib/ledger";

export type RequestChangeState = { error?: string; info?: string };

/**
 * Onda 29.4 — "Chiedi una modifica" sulla singola seduta. Sostituisce il
 * self-scaling +/- (Onda 27.3, rimosso): il nuotatore NON tocca più i giri
 * da solo, scrive una nota e la inoltra ad Alessio.
 *
 * ADR-001: mai una scrittura diretta su `workouts` da qui — è un MESSAGGIO
 * (notifica al coach), mai un update strutturato applicato alla scheda.
 * Copy di conferma: GLIDE_VOICE.md §5, riga "Chiede di cambiare
 * l'allenamento" — non riscriverla.
 */
export async function requestWorkoutChange(
  _prev: RequestChangeState,
  fd: FormData,
): Promise<RequestChangeState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta, rientra." };

  const workoutId = String(fd.get("workout_id") ?? "").trim();
  const note = String(fd.get("note") ?? "").trim();
  if (!workoutId) return { error: "Allenamento non valido." };
  if (!note) return { error: "Scrivi cosa vorresti cambiare." };
  if (note.length > 500) return { error: "Nota troppo lunga (max 500 caratteri)." };

  const supabase = await createClient();
  const { data: w } = await supabase
    .from("workouts")
    .select("title")
    .eq("id", workoutId)
    .maybeSingle();
  const title = (w?.title as string | undefined) ?? "un allenamento";

  await notifyCoaches(
    "richiesta",
    `${fullName(profile)} chiede una modifica`,
    `${title} — «${note}»`,
  );

  // Ledger: solo il fatto (nessun contenuto libero — coerente con readiness.note,
  // che vive nella tabella dedicata, non nel ledger append-only).
  await logEvent(supabase, profile.id, "workout.change_requested", {
    workout_id: workoutId,
  });

  return { info: "L'allenamento lo scrive Alessio. Gli inoltro la richiesta." };
}
