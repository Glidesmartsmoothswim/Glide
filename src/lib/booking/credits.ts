import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TZ } from "./config";

/**
 * Crediti lezione ed entitlement per pacchetto.
 * Il "tier" è il `profiles.service_type` REALE (coaching_1_1 | both | open),
 * non gli inventati elite/open_water (FASE 0.6: adatto i nomi, non la logica).
 */

export type Entitlement = {
  tier: string;
  lessons_granted: number;
  period: "month" | "bimonth";
  remote_allowed: boolean;
  can_book_extra: boolean;
};

export type CreditStatus = {
  remoteAllowed: boolean;
  canBookExtra: boolean;
  granted: number;
  used: number;
  remaining: number;
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD
};

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Data calendario di Roma come "YYYY-MM-DD". */
export function romeDateStr(d = new Date()): string {
  const { y, m, day } = romeYMD(d);
  return fmt(y, m, day);
}

/** Data calendario di Roma (Y/M/D) per un istante. */
export function romeYMD(d = new Date()): { y: number; m: number; day: number } {
  const p: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d))
    p[part.type] = part.value;
  return { y: Number(p.year), m: Number(p.month), day: Number(p.day) };
}

/** Estremi del periodo corrente (mese o bimestre Gen-Feb, Mar-Apr, …). */
export function periodBounds(
  period: "month" | "bimonth",
  ref = new Date(),
): { start: string; end: string } {
  const { y, m } = romeYMD(ref);
  if (period === "bimonth") {
    const startM = m - ((m - 1) % 2); // 1,3,5,7,9,11
    const endM = startM + 1;
    return { start: fmt(y, startM, 1), end: fmt(y, endM, lastDay(y, endM)) };
  }
  return { start: fmt(y, m, 1), end: fmt(y, m, lastDay(y, m)) };
}

/** Entitlement per service_type. Lettura consentita a ogni autenticato (RLS). */
export async function getEntitlement(
  supabase: SupabaseClient,
  serviceType: string | null,
): Promise<Entitlement | null> {
  if (!serviceType) return null;
  const { data } = await supabase
    .from("plan_entitlements")
    .select("*")
    .eq("tier", serviceType)
    .maybeSingle();
  return (data as Entitlement) ?? null;
}

/**
 * Garantisce che esista il record credito del periodo corrente.
 * IDEMPOTENTE grazie a unique(swimmer_id, period_start, source).
 * Richiede il client ADMIN: lesson_credits è scrivibile solo dal coach (RLS).
 */
export async function ensureCreditPeriod(
  admin: SupabaseClient,
  swimmerId: string,
  serviceType: string | null,
): Promise<void> {
  const ent = await getEntitlement(admin, serviceType);
  if (!ent || ent.lessons_granted <= 0) return;
  const { start, end } = periodBounds(ent.period);
  await admin.from("lesson_credits").upsert(
    {
      swimmer_id: swimmerId,
      period_start: start,
      period_end: end,
      granted: ent.lessons_granted,
      source: "plan",
    },
    { onConflict: "swimmer_id,period_start,source", ignoreDuplicates: true },
  );
}

/** Stato crediti per la UI e per la validazione lato server. */
export async function getCreditStatus(
  supabase: SupabaseClient,
  swimmerId: string,
  serviceType: string | null,
): Promise<CreditStatus> {
  const ent = await getEntitlement(supabase, serviceType);
  const period = ent?.period ?? "month";
  const { start, end } = periodBounds(period);

  const { data } = await supabase
    .from("lesson_credits")
    .select("granted, used")
    .eq("swimmer_id", swimmerId)
    .eq("period_start", start)
    .eq("source", "plan")
    .maybeSingle();

  const granted = data?.granted ?? ent?.lessons_granted ?? 0;
  const used = data?.used ?? 0;
  return {
    remoteAllowed: ent?.remote_allowed ?? false,
    canBookExtra: ent?.can_book_extra ?? true,
    granted,
    used,
    remaining: Math.max(0, granted - used),
    periodStart: start,
    periodEnd: end,
  };
}

/**
 * Consuma 1 credito in modo GUARDATO (optimistic concurrency): l'update va a
 * segno solo se `used` non è cambiato nel frattempo e c'è ancora margine.
 * Ritorna true se il credito è stato effettivamente consumato. Solo admin.
 */
export async function consumeCredit(
  admin: SupabaseClient,
  swimmerId: string,
  periodStart: string,
): Promise<boolean> {
  const { data: row } = await admin
    .from("lesson_credits")
    .select("id, used, granted")
    .eq("swimmer_id", swimmerId)
    .eq("period_start", periodStart)
    .eq("source", "plan")
    .maybeSingle();
  if (!row || row.used >= row.granted) return false;
  const { data: upd } = await admin
    .from("lesson_credits")
    .update({ used: row.used + 1 })
    .eq("id", row.id)
    .eq("used", row.used) // guardia anti doppio-consumo
    .select("id");
  return Boolean(upd && upd.length);
}

/** Restituisce 1 credito (disdetta in tempo). Mai sotto zero. Solo admin. */
export async function refundCredit(
  admin: SupabaseClient,
  swimmerId: string,
  periodStart: string,
): Promise<void> {
  const { data: row } = await admin
    .from("lesson_credits")
    .select("id, used")
    .eq("swimmer_id", swimmerId)
    .eq("period_start", periodStart)
    .eq("source", "plan")
    .maybeSingle();
  if (!row || row.used <= 0) return;
  await admin
    .from("lesson_credits")
    .update({ used: row.used - 1 })
    .eq("id", row.id)
    .eq("used", row.used);
}
