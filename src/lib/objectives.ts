/** Onda 13.3 — Obiettivi multipli (direzioni condivise col coach, non metriche). */

export const OBJECTIVE_KINDS = ["gara", "tecnica", "benessere", "evento"] as const;
export type ObjectiveKind = (typeof OBJECTIVE_KINDS)[number];

export const OBJECTIVE_KIND_LABEL: Record<ObjectiveKind, string> = {
  gara: "Gara",
  tecnica: "Tecnica",
  benessere: "Benessere",
  evento: "Evento",
};

export const OBJECTIVE_STATUSES = ["attivo", "raggiunto", "archiviato"] as const;
export type ObjectiveStatus = (typeof OBJECTIVE_STATUSES)[number];

export const OBJECTIVE_STATUS_LABEL: Record<ObjectiveStatus, string> = {
  attivo: "Attivo",
  raggiunto: "Raggiunto",
  archiviato: "Archiviato",
};

export type ObjectiveRow = {
  id: string;
  swimmer_id: string;
  title: string;
  kind: ObjectiveKind;
  target_date: string | null;
  status: ObjectiveStatus;
  created_at: string;
};
