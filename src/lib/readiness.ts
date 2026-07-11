export type ReadinessRow = {
  id: string;
  swimmer_id: string;
  workout_id: string | null;
  phase: "pre" | "post";
  sleep: number | null;
  fatigue: number | null;
  soreness: number | null;
  mood: number | null;
  motivation: number | null;
  rpe: number | null;
  note: string | null;
  created_at: string;
};

/** Domande pre-sessione (1–5). fatigue/soreness sono "invertite" nel punteggio. */
export const PRE_QUESTIONS: {
  key: "sleep" | "fatigue" | "soreness" | "mood" | "motivation";
  label: string;
  emoji: string;
  invert: boolean;
}[] = [
  { key: "sleep", label: "Sonno", emoji: "😴", invert: false },
  { key: "fatigue", label: "Fatica", emoji: "🔋", invert: true },
  { key: "soreness", label: "Dolori", emoji: "🩹", invert: true },
  { key: "mood", label: "Umore", emoji: "🙂", invert: false },
  { key: "motivation", label: "Motivazione", emoji: "🔥", invert: false },
];

/**
 * Punteggio prontezza 0–100 da un check-in pre.
 * fatigue/soreness contano invertite (meno = meglio).
 */
export function readinessScore(r: {
  sleep: number | null;
  fatigue: number | null;
  soreness: number | null;
  mood: number | null;
  motivation: number | null;
}): number | null {
  const { sleep, fatigue, soreness, mood, motivation } = r;
  if (
    sleep == null ||
    fatigue == null ||
    soreness == null ||
    mood == null ||
    motivation == null
  )
    return null;
  const raw = sleep + (6 - fatigue) + (6 - soreness) + mood + motivation; // 5..25
  return Math.round(((raw - 5) / 20) * 100);
}

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
