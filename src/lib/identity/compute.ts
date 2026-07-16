import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isoWeek, WEEKLY_TARGET } from "@/lib/score";
import { reflect, type Identity, type IdentitySignals } from "./index";

/**
 * Raccoglie i segnali per lo specchio identità (ultime 8+ settimane) dal
 * ledger e dai badge. Tutto auto-riferito: nessun dato di altri nuotatori.
 */
export async function computeIdentity(
  db: SupabaseClient,
  swimmerId: string,
): Promise<Identity | null> {
  const cutoff = new Date(Date.now() - 8 * 7 * 86_400_000).toISOString();

  const [{ data: events }, { data: capitano }, { data: firstEvent }] =
    await Promise.all([
      db
        .from("activity_events")
        .select("type, occurred_at")
        .eq("user_id", swimmerId)
        .gte("occurred_at", cutoff),
      db
        .from("swimmer_badges")
        .select("id")
        .eq("swimmer_id", swimmerId)
        .eq("badge_code", "capitano")
        .maybeSingle(),
      db
        .from("activity_events")
        .select("occurred_at")
        .eq("user_id", swimmerId)
        .order("occurred_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  const dataAgeWeeks = firstEvent
    ? Math.floor(
        (Date.now() - new Date(firstEvent.occurred_at).getTime()) /
          (7 * 86_400_000),
      )
    : 0;

  const byWeek: Record<string, number> = {};
  let videos = 0,
    raceSignups = 0,
    testsChosen = 0;
  for (const e of events ?? []) {
    if (e.type === "readiness.post") {
      const w = isoWeek(new Date(e.occurred_at));
      byWeek[w] = (byWeek[w] ?? 0) + 1;
    } else if (e.type === "video.uploaded") videos++;
    else if (e.type === "event.signup") raceSignups++;
    else if (e.type === "videoanalisi.done") testsChosen++;
  }

  // Le 8 settimane più recenti, dalla più vecchia alla più recente.
  const weeks: number[] = [];
  for (let i = 7; i >= 0; i--)
    weeks.push(byWeek[isoWeek(new Date(Date.now() - i * 7 * 86_400_000))] ?? 0);

  const weeksWithData = weeks.filter((c) => c > 0).length;
  const adherence =
    weeks.reduce((s, c) => s + Math.min(1, c / WEEKLY_TARGET), 0) /
    weeks.length;
  let steadyWeeks = 0;
  for (const c of weeks) steadyWeeks = c > 0 ? steadyWeeks + 1 : 0;

  const signals: IdentitySignals = {
    dataAgeWeeks,
    weeksWithData,
    adherence,
    steadyWeeks,
    videos,
    raceSignups,
    testsChosen,
    capitano: Boolean(capitano),
  };
  return reflect(signals);
}
