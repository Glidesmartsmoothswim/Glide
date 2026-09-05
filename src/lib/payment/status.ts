/**
 * ADR-016 (05/09/2026) — Lo stato di pagamento è DERIVATO, non persistito.
 *
 * `profiles.payment_status` resta binario e fattuale (ha pagato / non ha
 * pagato). Il gate ad accesso progressivo è una funzione PURA calcolata al
 * momento della lettura da `tier`, `payment_status` e `tier_expires_at`.
 * Nessun cron, nessuna colonna di stato che può divergere da sé stessa:
 * la scadenza è già la fonte di verità, il gate ne è solo una lettura.
 *
 * Questo modulo è la SORGENTE UNICA del contratto. Il rischio reale della
 * scelta B di ADR-016 è avere due implementazioni parallele che divergono:
 * ogni lettura di `payment_status` che decide COSA L'UTENTE PUÒ FARE deve
 * passare da qui. Le letture che registrano il fatto contabile (importo,
 * ricevuta, data incasso) restano dove sono — quelle non decidono permessi.
 *
 * Supersede il contratto di ./gate.ts (ADR-014), che guardava la sola
 * `tier_expires_at` e quindi non vedeva mai il caso "tier pagante con
 * payment_status nullo" — il bug dei tre profili bloccati.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type PaymentGate =
  /** Piano gratuito: il gate non si applica (funzioni Base sempre attive). */
  | "not_applicable"
  /** Non risulta pagato (o pagante senza scadenza: dato incoerente). */
  | "due"
  /** Periodo pagato in corso. */
  | "paid"
  /** Scaduto da ≤ graceDays: accesso INVARIATO, solo promemoria. */
  | "grace"
  /** Scaduto da > graceDays: erogazione ridotta alle funzioni Base. */
  | "overdue";

export interface PaymentInput {
  tier: string;
  payment_status: string | null;
  paid_at: string | null;
  tier_expires_at: string | null;
}

/** Default di `app_config.payment_grace_days` se la chiave non c'è (ADR-016). */
export const DEFAULT_GRACE_DAYS = 7;

const DAY = 24 * 60 * 60 * 1000;

/** ms di ritardo sulla scadenza, o null se la data manca/non è parsabile. */
function msPastExpiry(tierExpiresAt: string | null, now: Date): number | null {
  if (!tierExpiresAt) return null;
  const exp = new Date(tierExpiresAt).getTime();
  if (Number.isNaN(exp)) return null;
  return now.getTime() - exp;
}

/**
 * Contratto ADR-016, nell'ordine esatto — il primo match vince:
 *
 * | `tier === 'free'`               | `not_applicable` |
 * | `payment_status !== 'paid'`     | `due`            |
 * | `tier_expires_at == null`       | `due`            |
 * | `tier_expires_at > now`         | `paid`           |
 * | scaduto da ≤ `graceDays`        | `grace`          |
 * | altrimenti                      | `overdue`        |
 *
 * Funzione pura: nessun I/O, nessun `Date.now()` interno oltre al parametro
 * `now`. `graceDays` lo legge il CHIAMANTE da `app_config`
 * (`payment_grace_days`, default `DEFAULT_GRACE_DAYS`) — vedi
 * `paymentGraceDays()` sotto: tenerlo fuori è ciò che rende questa
 * funzione testabile senza mock.
 *
 * Override del coach: non esiste una colonna dedicata. L'override *è*
 * `tier_expires_at` — spostata avanti, il gate torna `paid` da solo. Una
 * sola leva, mai due che possono contraddirsi (ADR-016).
 */
export function derivePaymentGate(
  p: PaymentInput,
  graceDays: number,
  now: Date = new Date(),
): PaymentGate {
  if (p.tier === "free") return "not_applicable";
  if (p.payment_status !== "paid") return "due";
  // Pagante senza scadenza (o con una data illeggibile) = dato incoerente:
  // `due`, non accesso pieno. È il caso che il vincolo di schema
  // `tier_needs_payment_status` rende impossibile per costruzione.
  const past = msPastExpiry(p.tier_expires_at, now);
  if (past === null) return "due";
  if (past < 0) return "paid";
  return Math.floor(past / DAY) <= graceDays ? "grace" : "overdue";
}

/** Giorni interi di ritardo sulla scadenza (0 se non scaduta o assente). */
export function daysExpired(
  tierExpiresAt: string | null | undefined,
  now: Date = new Date(),
): number {
  const past = msPastExpiry(tierExpiresAt ?? null, now);
  return past === null ? 0 : Math.max(0, Math.floor(past / DAY));
}

/** Cosa il gate concede, mappa unica gate → permessi (ADR-016 Task 1). */
export interface GateAccess {
  /** true = accesso pieno al tier pagato; false = ridotto alle funzioni Base. */
  full: boolean;
  /** Banner di promemoria rinnovo (accesso comunque pieno). */
  renewalBanner: boolean;
  /** Schermata bloccante da mostrare, se serve. */
  screen: "renew" | "pay" | null;
}

export const GATE_ACCESS: Record<PaymentGate, GateAccess> = {
  // Base: prenotazioni ed eventi. `full` è irrilevante per un free — non ha
  // un tier pagante da degradare — ma resta true perché nulla gli va tolto.
  not_applicable: { full: true, renewalBanner: false, screen: null },
  paid: { full: true, renewalBanner: false, screen: null },
  grace: { full: true, renewalBanner: true, screen: null },
  overdue: { full: false, renewalBanner: false, screen: "renew" },
  due: { full: false, renewalBanner: false, screen: "pay" },
};

/**
 * true se il tier pagato eroga ancora (paid/grace/free). Da usare ovunque si
 * decida l'accesso a NUOVO contenuto. Non tocca archivio e readiness: quelli
 * sono ownership, non tier, e restano SEMPRE visibili (ADR-014, invariato).
 */
export function hasFullAccess(gate: PaymentGate): boolean {
  return GATE_ACCESS[gate].full;
}

/**
 * Tier "effettivo" per il gating: collassa sul tier gratuito quando il gate
 * non eroga (`due`/`overdue`).
 */
export function effectiveTierFor<T extends string>(
  tier: T,
  gate: PaymentGate,
  freeTier: T,
): T {
  return hasFullAccess(gate) ? tier : freeTier;
}

/**
 * Giorni di grazia da `app_config` (chiave `payment_grace_days`, default
 * `DEFAULT_GRACE_DAYS` = 7 — scelta commerciale, non tecnica: ADR-016).
 * Stesso pattern chiave-valore di `bankTransferDetails` (./bank.ts):
 * inserita da Alessio via SQL, lettura pubblica per RLS, nessun crash se
 * assente.
 *
 * Vive qui e NON dentro `derivePaymentGate` di proposito: la funzione deve
 * restare pura e testabile senza mock. L'import di `SupabaseClient` è
 * `import type`, quindi si cancella in compilazione e non trascina il
 * client Supabase nei bundle che importano solo il contratto.
 */
export async function paymentGraceDays(
  supabase: SupabaseClient,
): Promise<number> {
  const { data } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "payment_grace_days")
    .maybeSingle();
  const raw = data?.value as unknown;
  const n =
    typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_GRACE_DAYS;
}
