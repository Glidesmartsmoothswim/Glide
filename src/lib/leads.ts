/** Vocabolario e tipi della sottosezione Lead (CRM in ingresso, solo coach). */

export const LEAD_STAGES = [
  "nuovo",
  "contattato",
  "convertito",
  "perso",
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

export const STAGE_LABEL: Record<LeadStage, string> = {
  nuovo: "Nuovo",
  contattato: "Contattato",
  convertito: "Convertito",
  perso: "Perso",
};

/** Ordine "aperti" prima, "chiusi" dopo (per la vista a imbuto). */
export const STAGE_ORDER: LeadStage[] = [
  "nuovo",
  "contattato",
  "convertito",
  "perso",
];

export const LEAD_SOURCES = [
  "instagram",
  "tiktok",
  "sito",
  "passaparola",
  "altro",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const SOURCE_LABEL: Record<LeadSource, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  sito: "Sito",
  passaparola: "Passaparola",
  altro: "Altro",
};

export type LeadRow = {
  id: string;
  coach_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: LeadSource | null;
  stage: LeadStage;
  note: string | null;
  created_at: string;
};

export function isLeadStage(v: string): v is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(v);
}
export function isLeadSource(v: string): v is LeadSource {
  return (LEAD_SOURCES as readonly string[]).includes(v);
}
