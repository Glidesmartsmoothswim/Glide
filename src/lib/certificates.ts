/** Onda 13.2 — Certificato medico (dato sanitario). Semaforo di scadenza. */

export type MedicalCertRow = {
  id: string;
  swimmer_id: string;
  file_key: string;
  mime_type: string | null;
  data_scadenza: string;
  note: string | null;
  uploaded_at: string;
};

export type CertLight = "valido" | "in_scadenza" | "scaduto" | "assente";

const DAY = 24 * 60 * 60 * 1000;

/** Giorni alla scadenza (negativi se scaduto). Null se assente. */
export function daysToExpiry(dataScadenza: string | null): number | null {
  if (!dataScadenza) return null;
  const d = new Date(dataScadenza + "T00:00:00Z").getTime();
  if (Number.isNaN(d)) return null;
  return Math.ceil((d - Date.now()) / DAY);
}

/** Semaforo (13.2.4): verde valido, giallo entro 30gg, rosso scaduto/assente. */
export function certLight(dataScadenza: string | null): CertLight {
  const days = daysToExpiry(dataScadenza);
  if (days == null) return "assente";
  if (days < 0) return "scaduto";
  if (days <= 30) return "in_scadenza";
  return "valido";
}

export const CERT_LIGHT_LABEL: Record<CertLight, string> = {
  valido: "Valido",
  in_scadenza: "In scadenza",
  scaduto: "Scaduto",
  assente: "Assente",
};

/** Colore del pallino semaforo (token brand; rosso ammesso qui = allerta). */
export const CERT_LIGHT_DOT: Record<CertLight, string> = {
  valido: "#16A34A",
  in_scadenza: "#F59E0B",
  scaduto: "#DC2626",
  assente: "#DC2626",
};
