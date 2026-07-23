import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildSlots,
  romeWallToUtc,
  romeWeekday,
  type Busy,
  type Exception,
  type Mode,
  type Rule,
} from "./slots";
import { BOOKING } from "./config";

/** Servizio prenotabile (riga di `services`). */
export type Service = {
  id: string;
  code: string;
  name: string;
  mode: Mode;
  duration_min: number;
  buffer_min: number;
  price_cents: number;
  credit_cost: number;
};

const hhmm = (t: string) => t.slice(0, 5); // "12:00:00" → "12:00"

/** Coach unico (ADR-002). Il primo per iscrizione. */
export async function getCoachId(db: SupabaseClient): Promise<string | null> {
  const { data } = await db
    .from("profiles")
    .select("id")
    .eq("role", "coach")
    .order("member_since", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getServiceByCode(
  db: SupabaseClient,
  code: string,
): Promise<Service | null> {
  const { data } = await db
    .from("services")
    .select("id,code,name,mode,duration_min,buffer_min,price_cents,credit_cost")
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  return (data as Service) ?? null;
}

/**
 * Slot disponibili per (coach, giorno, servizio). Verità lato server: ricalcola
 * regole + eccezioni − prenotazioni confermate − eventi bloccanti.
 */
export async function computeDaySlots(
  db: SupabaseClient,
  coachId: string,
  dateStr: string,
  service: Service,
): Promise<Date[]> {
  const weekday = romeWeekday(dateStr);
  const dayStart = romeWallToUtc(dateStr, 0);
  const dayEnd = romeWallToUtc(dateStr, 24 * 60);

  const [rulesRes, excRes, bookRes, evRes] = await Promise.all([
    db
      .from("availability_rules")
      .select("weekday,start_time,end_time,slot_step,modes,valid_from,valid_to")
      .eq("coach_id", coachId)
      .eq("active", true),
    db
      .from("availability_exceptions")
      .select("kind,start_time,end_time,modes")
      .eq("coach_id", coachId)
      .eq("day", dateStr),
    db
      .from("bookings")
      .select("starts_at,block_until")
      .eq("coach_id", coachId)
      // pending + confirmed occupano lo slot (una richiesta blocca già l'orario).
      .in("status", ["pending", "confirmed"])
      .lt("starts_at", dayEnd.toISOString())
      .gt("block_until", dayStart.toISOString()),
    db
      .from("events")
      .select("starts_at,ends_at,travel_before_min,travel_after_min")
      .eq("coach_id", coachId)
      .eq("blocks_calendar", true)
      .neq("status", "cancelled")
      // margine per catturare il viaggio A/R che sconfina nel giorno
      .lt("starts_at", new Date(dayEnd.getTime() + 12 * 3_600_000).toISOString())
      .gt("ends_at", new Date(dayStart.getTime() - 12 * 3_600_000).toISOString()),
  ]);

  const rules: Rule[] = (rulesRes.data ?? [])
    .filter(
      (r: Record<string, string | null>) =>
        (!r.valid_from || r.valid_from <= dateStr) &&
        (!r.valid_to || r.valid_to >= dateStr),
    )
    .map((r: Record<string, unknown>) => ({
      weekday: r.weekday as number,
      start: hhmm(r.start_time as string),
      end: hhmm(r.end_time as string),
      step: r.slot_step as number,
      modes: (r.modes as Mode[]) ?? ["pool", "remote"],
    }));

  const exceptions: Exception[] = (excRes.data ?? []).map(
    (e: Record<string, unknown>) => ({
      kind: e.kind as "closed" | "extra",
      start: e.start_time ? hhmm(e.start_time as string) : undefined,
      end: e.end_time ? hhmm(e.end_time as string) : undefined,
      modes: (e.modes as Mode[]) ?? ["pool", "remote"],
    }),
  );

  const busy: Busy[] = [
    ...(bookRes.data ?? []).map((b: Record<string, string>) => ({
      start: new Date(b.starts_at),
      end: new Date(b.block_until),
    })),
    ...(evRes.data ?? []).map((e: Record<string, unknown>) => ({
      // il blocco include il viaggio A/R (glide-ext-videoanalisi §1)
      start: new Date(
        new Date(e.starts_at as string).getTime() -
          Number(e.travel_before_min ?? 0) * 60_000,
      ),
      end: new Date(
        new Date(e.ends_at as string).getTime() +
          Number(e.travel_after_min ?? 0) * 60_000,
      ),
    })),
  ];

  return buildSlots({
    dateStr,
    weekday,
    durationMin: service.duration_min,
    bufferMin: service.buffer_min,
    mode: service.mode,
    rules,
    exceptions,
    busy,
    leadTimeHours: BOOKING.leadHours,
    now: new Date(),
  });
}
