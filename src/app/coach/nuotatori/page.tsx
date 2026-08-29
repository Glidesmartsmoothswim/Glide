import { createClient } from "@/lib/supabase/server";
import { SERVICE_LABEL, STATUS_LABEL, fullName, initials, type SwimmerRow } from "@/lib/types";
import { TIER_LABEL } from "@/lib/access";
import { gateState, daysOverdue } from "@/lib/payment/gate";
import { TIER_LABEL as SUB_TIER_LABEL, type SubTier } from "@/lib/payment/pricing";
import { availableCount, type LessonTokenRow } from "@/lib/tokens";
import { NewSwimmer } from "./new-swimmer";
import {
  NuotatoriSegments,
  type OneToOneRow,
  type OpenRow,
  type FreeRow,
} from "./nuotatori-segments";

export const metadata = { title: "Nuotatori" };

/** Riduce righe ordinate desc a "la più recente per swimmer_id". */
function latestByKey<T extends Record<string, unknown>>(
  rows: T[],
  key: string,
): Map<string, T> {
  const m = new Map<string, T>();
  for (const r of rows) {
    const k = r[key] as string;
    if (!m.has(k)) m.set(k, r);
  }
  return m;
}

const fmtDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(
        new Date(iso),
      )
    : null;
const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

export default async function NuotatoriPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, role, first_name, last_name, email, phone, service_type, level, package, status, cert_status, cert_expiry, member_since, tier, tier_expires_at, payment_status, requested_tier, requested_tier_detail, payment_amount_cents",
    )
    .eq("role", "swimmer")
    .order("first_name", { ascending: true });

  type FullRow = SwimmerRow & {
    tier_expires_at: string | null;
    payment_status: "pending_payment" | "paid" | null;
    requested_tier: SubTier | null;
    requested_tier_detail: string | null;
    payment_amount_cents: number | null;
  };
  const swimmers = (data ?? []) as FullRow[];

  // Segment control (B.1): la coorte del coach vista per popolazione, non
  // per lista piatta — il tier ADR-014/015 è già la fonte, nessuna nuova
  // colonna: "Base gratuito" è semplicemente tier === 'free' (ADR-015 §Decisione).
  const oneToOneSw = swimmers.filter((s) => s.tier === "one_to_one");
  const openSw = swimmers.filter((s) => s.tier === "open" || s.tier === "open_plus");
  const freeSw = swimmers.filter((s) => s.tier === "free");

  const paymentSubtitle = (s: FullRow): string | null => {
    if (s.payment_status === "pending_payment" && s.requested_tier)
      return `Richiesta ${s.requested_tier_detail || SUB_TIER_LABEL[s.requested_tier]} in attesa`;
    const g = gateState(s.tier_expires_at);
    if (g === "overdue") return `Rinnovo scaduto — ${daysOverdue(s.tier_expires_at)} giorni`;
    if (g === "grace") return `In grazia — ${daysOverdue(s.tier_expires_at)} giorni`;
    return null;
  };

  const oneToOne: OneToOneRow[] = oneToOneSw.map((s) => ({
    id: s.id,
    initials: initials(s),
    name: fullName(s),
    sub: paymentSubtitle(s) ?? (s.member_since ? `Attivo dal ${fmtDate(s.member_since)}` : SERVICE_LABEL[s.service_type]),
    tierLabel: TIER_LABEL[s.tier],
    statusLabel: STATUS_LABEL[s.status],
    statusTone: s.status === "attivo" ? "ok" : s.status === "in_pausa" ? "warn" : "neutral",
  }));

  // ---- Segmento Open: readiness/onda/aderenza/ultimo allenamento in batch,
  // niente query per-riga (B.3 — leggibile in una schermata, non N query).
  const openIds = openSw.map((s) => s.id);
  const [rdRes, scoreRes, compRes] = openIds.length
    ? await Promise.all([
        supabase
          .from("v_readiness")
          .select("swimmer_id, readiness_fisica, readiness_mentale, created_at")
          .in("swimmer_id", openIds)
          .not("readiness_fisica", "is", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("glide_scores")
          .select("swimmer_id, onda, dims, week")
          .in("swimmer_id", openIds)
          .order("week", { ascending: false }),
        supabase
          .from("workout_completions")
          .select("swimmer_id, completed_at")
          .in("swimmer_id", openIds)
          .order("completed_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const rdByS = latestByKey((rdRes.data ?? []) as Record<string, unknown>[], "swimmer_id");
  const scoreByS = latestByKey((scoreRes.data ?? []) as Record<string, unknown>[], "swimmer_id");
  const compByS = latestByKey((compRes.data ?? []) as Record<string, unknown>[], "swimmer_id");

  const open: OpenRow[] = openSw.map((s) => {
    const rd = rdByS.get(s.id) as
      | { readiness_fisica: number | null; readiness_mentale: number | null }
      | undefined;
    const sc = scoreByS.get(s.id) as { onda: number; dims: { aderenza?: number } } | undefined;
    const comp = compByS.get(s.id) as { completed_at: string } | undefined;
    const paused = s.status === "in_pausa";
    return {
      id: s.id,
      name: fullName(s),
      statusLabel: STATUS_LABEL[s.status],
      statusTone: s.status === "attivo" ? "ok" : s.status === "in_pausa" ? "warn" : "neutral",
      paymentLabel:
        paymentSubtitle(s) ??
        (s.payment_status === "paid" || s.tier_expires_at ? "Pagato" : "—"),
      paymentTone:
        paymentSubtitle(s) != null
          ? gateState(s.tier_expires_at) === "overdue"
            ? "bad"
            : "warn"
          : "ok",
      fisica: paused ? null : (rd?.readiness_fisica ?? null),
      mentale: paused ? null : (rd?.readiness_mentale ?? null),
      onda: paused ? null : (sc?.onda ?? null),
      aderenza: paused ? null : (sc?.dims?.aderenza ?? null),
      lastWorkout: comp ? fmtDate(comp.completed_at) : null,
    };
  });

  // ---- Segmento Base gratuito (ADR-015): prenotazioni + saldo token, niente
  // dato di allenamento (non ha programmazione strutturata).
  const freeIds = freeSw.map((s) => s.id);
  const [bookRes, tokRes] = freeIds.length
    ? await Promise.all([
        supabase
          .from("bookings")
          .select("swimmer_id, starts_at, status, services(name)")
          .in("swimmer_id", freeIds)
          .neq("status", "cancelled")
          .order("starts_at", { ascending: false }),
        supabase.from("lesson_tokens").select("*").in("swimmer_id", freeIds),
      ])
    : [{ data: [] }, { data: [] }];
  type BookRow = { swimmer_id: string; starts_at: string; status: string; services: { name: string } | null };
  const bookingsBySw = new Map<string, BookRow[]>();
  for (const b of (bookRes.data ?? []) as unknown as BookRow[])
    (bookingsBySw.get(b.swimmer_id) ?? bookingsBySw.set(b.swimmer_id, []).get(b.swimmer_id)!).push(b);
  const tokensBySw = new Map<string, LessonTokenRow[]>();
  for (const t of (tokRes.data ?? []) as LessonTokenRow[])
    (tokensBySw.get(t.swimmer_id) ?? tokensBySw.set(t.swimmer_id, []).get(t.swimmer_id)!).push(t);

  // Server Component: `now` è il timestamp DI QUESTA richiesta, non un valore
  // che cambia durante un render client — stesso pattern pre-esistente in
  // app/page.tsx (react-hooks/purity è pensata per componenti client).
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const free: FreeRow[] = freeSw.map((s) => {
    const bookings = bookingsBySw.get(s.id) ?? [];
    const upcoming = bookings
      .filter((b) => new Date(b.starts_at).getTime() >= now && b.status !== "no_show")
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
    const tokens = tokensBySw.get(s.id) ?? [];
    return {
      id: s.id,
      name: fullName(s),
      nextBooking: upcoming
        ? `${fmtDateTime(upcoming.starts_at)}${upcoming.services?.name ? ` · ${upcoming.services.name}` : ""}`
        : null,
      tokenBalance: availableCount(tokens),
      bookingCount: bookings.length,
      history: bookings.slice(0, 8).map((b) => ({
        label: `${fmtDateTime(b.starts_at)} — ${b.services?.name ?? "Lezione"}${
          b.status === "completed" ? " (completata)" : new Date(b.starts_at).getTime() < now ? " (passata)" : " (in programma)"
        }`,
      })),
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-foreground">Nuotatori</h1>
          <p className="text-sm text-muted">
            {swimmers.length} atlet{swimmers.length === 1 ? "a" : "i"} · gestisci schede e servizi
          </p>
        </div>
        <NewSwimmer />
      </header>

      {swimmers.length === 0 ? (
        <p className="rounded-2xl border border-border bg-surface p-5 text-muted">
          Nessun nuotatore ancora. Creane uno con “Nuovo nuotatore”, oppure
          invita gli atleti a registrarsi: nascono come swimmer.
        </p>
      ) : (
        <NuotatoriSegments oneToOne={oneToOne} open={open} free={free} />
      )}
    </div>
  );
}
