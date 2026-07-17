import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isoWeek, WEEKLY_TARGET } from "@/lib/score";

/**
 * Detection dei badge AUTOMATICI (GLIDE_GAMIFICATION §5). Idempotente:
 * assegna solo ciò che non c'è già. I badge data-hungry (Acqua Calma,
 * Metronomo, Tecnico, Costruttore) restano nel catalogo ma la loro detection
 * arriverà con abbastanza storico: meglio non assegnare che assegnare a caso.
 */

const monthKey = (d: Date) => {
  const p: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(d))
    p[part.type] = part.value;
  return `${p.year}-${p.month}`;
};

function lastMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++)
    out.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 15)));
  return out; // dal più recente al più vecchio
}

/** Assegna un badge automatico se non presente. */
async function award(
  admin: SupabaseClient,
  swimmerId: string,
  code: string,
): Promise<void> {
  await admin
    .from("swimmer_badges")
    .upsert(
      { swimmer_id: swimmerId, badge_code: code, awarded_by: null },
      { onConflict: "swimmer_id,badge_code", ignoreDuplicates: true },
    );
}

export async function detectAndAward(
  admin: SupabaseClient,
  swimmerId: string,
): Promise<string[]> {
  const awarded: string[] = [];

  // ADR-005 §8: nuotatore in pausa → nessun badge, nessuna notifica.
  const { data: prof } = await admin
    .from("profiles")
    .select("status")
    .eq("id", swimmerId)
    .maybeSingle();
  if ((prof?.status ?? "attivo").toLowerCase() !== "attivo") return awarded;

  // FASE 6.3: nessun badge scatta con readiness_fisica < 3.0 (ultime 2 sett.):
  // premiare chi sta male è un incentivo all'infortunio.
  const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const { data: fis } = await admin
    .from("v_readiness")
    .select("readiness_fisica")
    .eq("swimmer_id", swimmerId)
    .gte("created_at", twoWeeksAgo)
    .not("readiness_fisica", "is", null);
  const fisiche = (fis ?? [])
    .map((r) => Number(r.readiness_fisica))
    .filter((n) => !Number.isNaN(n));
  if (fisiche.length > 0) {
    const avg = fisiche.reduce((s, n) => s + n, 0) / fisiche.length;
    if (avg < 3.0) return awarded;
  }

  const cutoff = new Date(Date.now() - 30 * 7 * 86_400_000).toISOString();
  const { data: events } = await admin
    .from("activity_events")
    .select("type, occurred_at")
    .eq("user_id", swimmerId)
    .gte("occurred_at", cutoff)
    .in("type", ["readiness.pre", "readiness.post"]);

  const posts = (events ?? []).filter((e) => e.type === "readiness.post");
  const pres = (events ?? []).filter((e) => e.type === "readiness.pre");

  // Prima Bracciata: almeno un ciclo pre + post.
  if (pres.length >= 1 && posts.length >= 1) {
    await award(admin, swimmerId, "prima_bracciata");
    awarded.push("prima_bracciata");
  }

  // Conteggi settimanali dei post.
  const byWeek: Record<string, number> = {};
  for (const e of posts) {
    const w = isoWeek(new Date(e.occurred_at));
    byWeek[w] = (byWeek[w] ?? 0) + 1;
  }
  // Ultime 12 settimane, dalla più vecchia alla più recente.
  const weeks: number[] = [];
  for (let i = 11; i >= 0; i--)
    weeks.push(byWeek[isoWeek(new Date(Date.now() - i * 7 * 86_400_000))] ?? 0);
  // ≥75% di WEEKLY_TARGET previste → ceil(0.75*target) sedute.
  const need = Math.ceil(0.75 * WEEKLY_TARGET);
  let run = 0;
  let primeOnde = false;
  for (const c of weeks) {
    run = c >= need ? run + 1 : 0;
    if (run >= 4) primeOnde = true;
  }
  if (primeOnde) {
    await award(admin, swimmerId, "prime_onde");
    awarded.push("prime_onde");
  }

  // Onda dopo Onda: 6 mesi consecutivi senza un mese intero fermo.
  const months = lastMonths(6);
  const monthsWithPost = new Set(posts.map((e) => monthKey(new Date(e.occurred_at))));
  if (months.every((m) => monthsWithPost.has(m))) {
    await award(admin, swimmerId, "onda_dopo_onda");
    awarded.push("onda_dopo_onda");
  }

  return awarded;
}
