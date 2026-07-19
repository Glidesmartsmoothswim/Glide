import type { Block } from "@/lib/workout";
import type { Tier } from "@/lib/access";

export type ServiceType = "coaching_1_1" | "open" | "both";
export type SwimmerStatus = "attivo" | "in_pausa" | "scaduto";
export type CertStatus = "valido" | "in_scadenza" | "assente";
export type WorkoutKind = "personal" | "open_channel" | "template";
export type WeekDay = "Lun" | "Mar" | "Mer" | "Gio" | "Ven" | "Sab" | "Dom";

export const WEEK_DAYS: WeekDay[] = [
  "Lun",
  "Mar",
  "Mer",
  "Gio",
  "Ven",
  "Sab",
  "Dom",
];

export const SERVICE_LABEL: Record<ServiceType, string> = {
  coaching_1_1: "1:1",
  open: "Open",
  both: "1:1 + Open",
};

export const STATUS_LABEL: Record<SwimmerStatus, string> = {
  attivo: "Attivo",
  in_pausa: "In pausa",
  scaduto: "Scaduto",
};

export const CERT_LABEL: Record<CertStatus, string> = {
  valido: "Valido",
  in_scadenza: "In scadenza",
  assente: "Assente",
};

/** Riga profiles (nuotatore o coach). */
export type SwimmerRow = {
  id: string;
  role: "coach" | "swimmer";
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  service_type: ServiceType;
  tier: Tier;
  level: string | null;
  package: string | null;
  status: SwimmerStatus;
  cert_status: CertStatus;
  cert_expiry: string | null;
  member_since: string | null;
};

/** Riga workouts. */
export type WorkoutRow = {
  id: string;
  coach_id: string;
  swimmer_id: string | null;
  kind: WorkoutKind;
  title: string;
  focus: string | null;
  pool: number | null;
  week_day: WeekDay | null;
  week_start: string | null;
  blocks: Block[];
  total_meters: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
};

export const fullName = (p: {
  first_name: string | null;
  last_name: string | null;
  email?: string | null;
}) =>
  [p.first_name, p.last_name].filter(Boolean).join(" ") ||
  p.email ||
  "Senza nome";

export const initials = (p: {
  first_name: string | null;
  last_name: string | null;
  email?: string | null;
}) => {
  const f = p.first_name?.[0] ?? "";
  const l = p.last_name?.[0] ?? "";
  const s = (f + l).toUpperCase();
  return s || (p.email?.[0]?.toUpperCase() ?? "?");
};
