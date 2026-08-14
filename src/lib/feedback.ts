/**
 * Onda 28.2 — Feedback settimanale dell'atleta.
 * Una volta a settimana l'app propone: "come è andata?" (1-5) + argomenti
 * che vorrebbe approfondire (vocabolario chiuso qui sotto) + nota libera.
 * Alimenta il riepilogo "idee per i prossimi post" su /coach/social.
 */

export type FeedbackTopic =
  | "tecnica"
  | "allenamento"
  | "gare"
  | "alimentazione"
  | "mentale"
  | "recupero"
  | "materiali";

export const FEEDBACK_TOPICS: { id: FeedbackTopic; label: string }[] = [
  { id: "tecnica", label: "Tecnica" },
  { id: "allenamento", label: "Allenamento" },
  { id: "gare", label: "Gare" },
  { id: "alimentazione", label: "Alimentazione" },
  { id: "mentale", label: "Testa e motivazione" },
  { id: "recupero", label: "Recupero" },
  { id: "materiali", label: "Materiali e attrezzatura" },
];

export const topicLabel = (id: string): string =>
  FEEDBACK_TOPICS.find((t) => t.id === id)?.label ?? id;

export const RATING_ANCHORS: Record<number, string> = {
  1: "Settimana no",
  2: "Così così",
  3: "Nella norma",
  4: "Bella settimana",
  5: "Settimana top",
};

export type WeeklyFeedbackRow = {
  id: string;
  swimmer_id: string;
  week_start: string;
  rating: number;
  topics: string[];
  note: string | null;
  created_at: string;
};
