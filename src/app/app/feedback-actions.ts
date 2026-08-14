"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { logEvent } from "@/lib/ledger";
import { currentMonday } from "@/lib/week";
import { FEEDBACK_TOPICS } from "@/lib/feedback";

export type FeedbackState = { error?: string; info?: string };

const VALID_TOPICS = new Set(FEEDBACK_TOPICS.map((t) => t.id));

/**
 * Feedback settimanale (Onda 28.2): una riga per nuotatore+settimana
 * (upsert, così può correggersi se ci riprova). La nota resta fuori dal
 * ledger — stesso pattern del "una nota per Alessio" post-sessione.
 */
export async function submitWeeklyFeedback(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };

  const rating = Math.min(5, Math.max(1, Number(formData.get("rating") ?? 0)));
  if (!rating) return { error: "Valuta la settimana da 1 a 5." };

  const topics = formData
    .getAll("topics")
    .map(String)
    .filter((t) => VALID_TOPICS.has(t as never));
  const note = String(formData.get("note") ?? "").trim() || null;
  const week = currentMonday();

  const supabase = await createClient();
  const { error } = await supabase.from("weekly_feedback").upsert(
    { swimmer_id: profile.id, week_start: week, rating, topics, note },
    { onConflict: "swimmer_id,week_start" },
  );
  if (error) return { error: error.message };

  await logEvent(supabase, profile.id, "feedback.weekly", {
    week_start: week,
    rating,
    topics,
    has_note: Boolean(note),
  });

  revalidatePath("/app");
  return { info: "Grazie! Alessio lo legge per pensare ai prossimi contenuti." };
}
