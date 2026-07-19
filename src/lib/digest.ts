import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fullName } from "@/lib/types";
import { PHASE_LABEL, type PhaseType } from "@/lib/programs";

/**
 * Digest coach (GLIDE FASE 1.5). 4 sezioni, max 3 righe, ogni riga un'azione.
 * Contiene OSSERVAZIONI, mai prescrizioni (ADR-001). Segnale chiave:
 * readiness_fisica buona (>=3.5) MA sedute saltate → è MOTIVAZIONE, non
 * stanchezza → serve una telefonata, non un carico più leggero.
 */
export type DigestRow = { swimmerId: string; text: string; href?: string };
export type DigestSection = { title: string; rows: DigestRow[] };

const DAY = 24 * 60 * 60 * 1000;

type RRow = {
  swimmer_id: string;
  phase: string;
  sleep: number | null;
  energia: number | null;
  corpo: number | null;
  red_flag: boolean | null;
  health_flag: boolean | null;
  pain_sites: string[] | null;
  created_at: string;
};

export async function computeDigest(
  supabase: SupabaseClient,
): Promise<DigestSection[]> {
  const now = Date.now();
  const since = new Date(now - 21 * DAY).toISOString();

  const { data: sw } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, cert_status")
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
    .select(
      "swimmer_id, phase, sleep, energia, corpo, red_flag, health_flag, pain_sites, created_at",
    )
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

  const chiamare: DigestRow[] = [];
  const scivola: DigestRow[] = [];
  const corpo: DigestRow[] = [];
  const certificati: DigestRow[] = [];

  for (const s of swimmers) {
    const name = nameById.get(s.id) ?? "Atleta";
    const list = byS.get(s.id) ?? [];

    // 1) Da chiamare — red flag salute negli ultimi 7 giorni
    const red = list.find(
      (r) => r.red_flag && now - new Date(r.created_at).getTime() <= 7 * DAY,
    );
    if (red)
      chiamare.push({
        swimmerId: s.id,
        text: withCtx(s.id, `${name} — segnale salute. Chiamalo.`),
      });

    // 2) Sta scivolando — ultima fisica buona ma sparito da >= 5 giorni
    const lastPre = list.find((r) => r.phase === "pre" && r.sleep != null);
    if (lastPre) {
      const fisica =
        ((lastPre.sleep ?? 0) + (lastPre.energia ?? 0) + (lastPre.corpo ?? 0)) / 3;
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

    // 3) Corpo — stessa zona di dolore >= 2 volte
    const sites = new Map<string, number>();
    for (const r of list)
      for (const p of r.pain_sites ?? []) sites.set(p, (sites.get(p) ?? 0) + 1);
    const recurring = [...sites.entries()].find(([, c]) => c >= 2);
    if (recurring)
      corpo.push({
        swimmerId: s.id,
        text: withCtx(s.id, `${name} — dolore ricorrente: ${recurring[0]}. Chiedigliene.`),
      });

    // 4) Certificati — in scadenza o assente
    if (s.cert_status === "in_scadenza" || s.cert_status === "assente")
      certificati.push({
        swimmerId: s.id,
        text: `${name} — certificato ${s.cert_status === "assente" ? "assente" : "in scadenza"}.`,
      });
  }

  // 5) I numeri — incassi in sospeso (ADR-011): il contante si dimentica.
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

  const cut = (rows: DigestRow[]) => rows.slice(0, 3);
  return [
    { title: "Da chiamare", rows: cut(chiamare) },
    { title: "Sta scivolando", rows: cut(scivola) },
    { title: "Corpo", rows: cut(corpo) },
    { title: "Certificati", rows: cut(certificati) },
    { title: "I numeri", rows: cut(numeri) },
  ];
}
