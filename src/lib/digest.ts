import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fullName } from "@/lib/types";
import { PHASE_LABEL, type PhaseType } from "@/lib/programs";
import { gateState, daysOverdue } from "@/lib/payment/gate";
import { TIER_LABEL as SUB_TIER_LABEL, type SubTier } from "@/lib/payment/pricing";

/**
 * Digest coach (GLIDE FASE 1.5). Max 3 righe per sezione, ogni riga un'azione.
 * Contiene OSSERVAZIONI, mai prescrizioni (ADR-001). Segnale chiave:
 * readiness_fisica buona (>=3.5) MA sedute saltate → è MOTIVAZIONE, non
 * stanchezza → serve una telefonata, non un carico più leggero.
 *
 * ADR-013: le sezioni "Da chiamare" (da `red_flag`) e "Corpo" (dolore
 * ricorrente da `pain_sites`) sono state rimosse insieme alle colonne che le
 * alimentavano — erano dato sanitario strutturato. Il segnale rosso resta
 * comunque immediato: il matcher ADR-004 (chat/nota) notifica il coach in
 * tempo reale via `notifyCoaches`, indipendentemente dal digest.
 */
export type DigestRow = { swimmerId: string; text: string; href?: string };
export type DigestSection = { title: string; rows: DigestRow[] };

const DAY = 24 * 60 * 60 * 1000;

type RRow = {
  swimmer_id: string;
  phase: string;
  sleep: number | null;
  energia: number | null;
  created_at: string;
};

export async function computeDigest(
  supabase: SupabaseClient,
): Promise<DigestSection[]> {
  const now = Date.now();
  const since = new Date(now - 21 * DAY).toISOString();

  const { data: sw } = await supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, email, tier_expires_at, payment_status, requested_tier, requested_tier_detail, payment_amount_cents",
    )
    .eq("role", "swimmer");
  const swimmers = sw ?? [];
  const nameById = new Map(
    swimmers.map((s) => [
      s.id,
      fullName({ first_name: s.first_name, last_name: s.last_name, email: s.email }),
    ]),
  );

  const { data: rd } = await supabase
    .from("readiness")
    .select("swimmer_id, phase, sleep, energia, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  const rows = (rd ?? []) as RRow[];

  const byS = new Map<string, RRow[]>();
  for (const r of rows) {
    (byS.get(r.swimmer_id) ?? byS.set(r.swimmer_id, []).get(r.swimmer_id)!).push(r);
  }

  // Contesto programma 1:1 attivo: fase corrente + giorni-a-gara (§3.3).
  const { data: progs } = await supabase
    .from("programs")
    .select("id, swimmer_id, goal_race_date")
    .eq("status", "active");
  const progIds = (progs ?? []).map((p) => p.id);
  const { data: phs } = progIds.length
    ? await supabase
        .from("program_phases")
        .select("program_id, phase_type, start_date, end_date")
        .in("program_id", progIds)
    : { data: [] };
  const ctxById = new Map<string, string>();
  for (const p of progs ?? []) {
    const phases = (phs ?? []).filter((x) => x.program_id === p.id);
    const cur = phases.find(
      (x) =>
        now >= new Date(x.start_date).getTime() &&
        now <= new Date(x.end_date).getTime() + DAY,
    );
    const days = p.goal_race_date
      ? Math.ceil((new Date(p.goal_race_date).getTime() - now) / DAY)
      : null;
    const parts: string[] = [];
    if (cur) parts.push(PHASE_LABEL[cur.phase_type as PhaseType]);
    if (days != null && days >= 0) parts.push(`gara tra ${days} gg`);
    if (parts.length) ctxById.set(p.swimmer_id as string, parts.join(" · "));
  }
  const withCtx = (id: string, text: string) => {
    const c = ctxById.get(id);
    return c ? `${text} (${c})` : text;
  };

  const scivola: DigestRow[] = [];

  for (const s of swimmers) {
    const name = nameById.get(s.id) ?? "Atleta";
    const list = byS.get(s.id) ?? [];

    // 1) Sta scivolando — ultima fisica buona ma sparito da >= 5 giorni
    const lastPre = list.find((r) => r.phase === "pre" && r.sleep != null);
    if (lastPre) {
      const fisica = ((lastPre.sleep ?? 0) + (lastPre.energia ?? 0)) / 2;
      const days = Math.floor((now - new Date(lastPre.created_at).getTime()) / DAY);
      if (fisica >= 3.5 && days >= 5)
        scivola.push({
          swimmerId: s.id,
          text: withCtx(
            s.id,
            `${name} — fisicamente sta bene ma è sparito da ${days} giorni. È motivazione, non stanchezza: una telefonata.`,
          ),
        });
    }
  }

  // I numeri — incassi in sospeso (ADR-011): il contante si dimentica.
  const numeri: DigestRow[] = [];
  const { data: pend } = await supabase
    .from("bookings")
    .select("amount_cents, starts_at")
    .eq("payment_method", "cash")
    .eq("payment_status", "da_incassare")
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true });
  if (pend && pend.length > 0) {
    const tot = pend.reduce((s, b) => s + (b.amount_cents ?? 0), 0);
    const oldestDays = Math.floor(
      (now - new Date(pend[0].starts_at).getTime()) / DAY,
    );
    numeri.push({
      swimmerId: "",
      href: "/coach/agenda?tab=cassa",
      text: `${pend.length} ${pend.length === 1 ? "lezione" : "lezioni"} da incassare · €${Math.round(tot / 100)}${
        oldestDays > 0 ? ` · la più vecchia è di ${oldestDays} giorni fa` : ""
      }`,
    });
  }

  // Pagamenti (ADR-014/A.6): richieste in attesa + abbonamenti in grazia/
  // scaduti. Ordinati per gravità (overdue prima, poi giorni di ritardo).
  const pagamenti: (DigestRow & { rank: number })[] = [];
  for (const s of swimmers) {
    const name = nameById.get(s.id) ?? "Atleta";
    const p = s as unknown as {
      tier_expires_at: string | null;
      payment_status: "pending_payment" | "paid" | null;
      requested_tier: SubTier | null;
      requested_tier_detail: string | null;
      payment_amount_cents: number | null;
    };
    if (p.payment_status === "pending_payment" && p.requested_tier) {
      pagamenti.push({
        swimmerId: s.id,
        href: `/coach/nuotatori/${s.id}`,
        text: `${name} — richiesta ${p.requested_tier_detail || SUB_TIER_LABEL[p.requested_tier]} in attesa di incasso${
          p.payment_amount_cents ? ` (€${Math.round(p.payment_amount_cents / 100)})` : ""
        }.`,
        rank: 3,
      });
      continue;
    }
    const state = gateState(p.tier_expires_at);
    if (state === "grace" || state === "overdue") {
      const days = daysOverdue(p.tier_expires_at);
      pagamenti.push({
        swimmerId: s.id,
        href: `/coach/nuotatori/${s.id}`,
        text: `${name} — ${state === "overdue" ? "scaduto" : "in grazia"} da ${days} ${days === 1 ? "giorno" : "giorni"}.`,
        rank: state === "overdue" ? 1 : 2,
      });
    }
  }
  pagamenti.sort((a, b) => a.rank - b.rank);

  const cut = (rows: DigestRow[]) => rows.slice(0, 3);
  return [
    { title: "Sta scivolando", rows: cut(scivola) },
    { title: "Pagamenti", rows: cut(pagamenti) },
    { title: "I numeri", rows: cut(numeri) },
  ];
}
