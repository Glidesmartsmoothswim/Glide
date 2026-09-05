import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { reportPaymentWriteError } from "./errors";
import type { TokenRedeemableFor } from "@/lib/tokens";

/**
 * ADR-016 (pacchetti lezioni prepagati) — un pacchetto emette token, e un
 * token è credito spendibile: non si consegna prima dell'incasso. Il flusso
 * ricalca quello già collaudato sugli abbonamenti (richiesta → bonifico →
 * marcatura manuale del coach), applicato a un acquisto una tantum.
 *
 * L'ordine NON nasce da un insert del client: passa dalla RPC
 * `request_package` (SECURITY DEFINER), che snapshotta l'importo dal listino
 * lato server. Così il client non può proporre il proprio prezzo, e un
 * ritocco di listino non altera gli ordini già pendenti (ADR-008).
 *
 * L'emissione dei token è un trigger sul DB, non codice applicativo: è
 * idempotente su `tokens_issued_at`, quindi una seconda marcatura "pagato"
 * non raddoppia il credito.
 */

export type LessonPackage = {
  id: string;
  code: string;
  name: string;
  redeemable_for: TokenRedeemableFor;
  quantity: number;
  price_cents: number;
  stamp_duty_cents: number;
};

export type PackagePurchase = {
  id: string;
  swimmer_id: string;
  quantity: number;
  redeemable_for: TokenRedeemableFor;
  amount_cents: number;
  status: "pending_payment" | "paid" | "cancelled";
  requested_at: string;
  paid_at: string | null;
  receipt_number: string | null;
  tokens_issued_at: string | null;
};

/** Totale a carico del cliente: prezzo + eventuale bollo. */
export const packageTotalCents = (p: {
  price_cents: number;
  stamp_duty_cents: number;
}): number => p.price_cents + p.stamp_duty_cents;

/** Prezzo per singola lezione, per mostrare il risparmio sul pacchetto. */
export const packagePerLessonCents = (p: {
  price_cents: number;
  stamp_duty_cents: number;
  quantity: number;
}): number => Math.round(packageTotalCents(p) / p.quantity);

/** Listino pacchetti attivi, ordinato come deciso dal coach. */
export async function activePackages(
  supabase: SupabaseClient,
): Promise<LessonPackage[]> {
  const { data } = await supabase
    .from("lesson_packages")
    .select("id, code, name, redeemable_for, quantity, price_cents, stamp_duty_cents")
    .eq("active", true)
    .order("sort", { ascending: true });
  return (data ?? []) as LessonPackage[];
}

/** Richiesta pendente del nuotatore, se ne ha una. Al massimo una per volta. */
export async function pendingPurchase(
  supabase: SupabaseClient,
  swimmerId: string,
): Promise<PackagePurchase | null> {
  const { data } = await supabase
    .from("package_purchases")
    .select(
      "id, swimmer_id, quantity, redeemable_for, amount_cents, status, requested_at, paid_at, receipt_number, tokens_issued_at",
    )
    .eq("swimmer_id", swimmerId)
    .eq("status", "pending_payment")
    .maybeSingle();
  return (data as PackagePurchase) ?? null;
}

/**
 * Crea l'ordine via RPC. Gli errori del DB arrivano già parlanti: la RPC alza
 * `22023` con un messaggio in italiano per "pacchetto non disponibile" e per
 * "hai già una richiesta in attesa".
 */
export async function requestPackage(
  supabase: SupabaseClient,
  packageId: string,
): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase.rpc("request_package", {
    p_package_id: packageId,
  });
  if (error)
    return {
      error: reportPaymentWriteError(error, { op: "requestPackage" }).message,
    };
  return { id: data as string };
}

/**
 * "Segna pagato" del coach. NON emette i token da qui: lo fa il trigger
 * `issue_package_tokens`, che è idempotente — se lo facessimo in codice
 * dovremmo garantire noi che una doppia marcatura non raddoppi il credito.
 */
export async function markPurchasePaid(
  supabase: SupabaseClient,
  purchaseId: string,
  receiptNumber?: string | null,
): Promise<{ info?: string; error?: string }> {
  const { data, error } = await supabase
    .from("package_purchases")
    .update({
      status: "paid",
      receipt_number: receiptNumber?.trim() || null,
    })
    .eq("id", purchaseId)
    .eq("status", "pending_payment")
    .select("id, swimmer_id, quantity, amount_cents")
    .maybeSingle();

  if (error)
    return {
      error: reportPaymentWriteError(error, {
        op: "markPurchasePaid",
        swimmerId: purchaseId,
      }).message,
    };
  // Nessuna riga aggiornata = l'ordine non era più pendente (già incassato o
  // annullato). Va detto, non ingoiato: il coach deve sapere che il suo clic
  // non ha fatto nulla.
  if (!data)
    return { error: "Ordine non più in attesa: forse è già stato incassato." };

  // Business/Ricavi legge SOLO `transactions`: senza questa riga un pacchetto
  // incassato non comparirebbe mai nei ricavi né nella soglia forfettario.
  // Stessa scelta già fatta per gli abbonamenti in markPaid.
  const { error: txError } = await supabase.from("transactions").insert({
    swimmer_id: data.swimmer_id,
    type: "package",
    amount_cents: data.amount_cents,
    currency: "eur",
    status: "succeeded",
    description: `Pacchetto ${data.quantity} lezioni — incasso manuale`,
  });
  // I token sono già stati emessi dal trigger: se fallisce solo la riga dei
  // ricavi non si annulla l'incasso, ma non lo si nasconde nemmeno.
  if (txError) {
    reportPaymentWriteError(txError, {
      op: "markPurchasePaid:transaction",
      swimmerId: data.swimmer_id,
    });
    return {
      info: `Pacchetto incassato: ${data.quantity} token emessi. ⚠️ La riga nei ricavi non è stata scritta, va aggiunta a mano.`,
    };
  }

  return { info: `Pacchetto incassato: ${data.quantity} token emessi.` };
}
