import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BankTransferDetails = { iban: string; holder: string };

/**
 * Coordinate di bonifico (GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md §Canali e
 * regole di richiesta pagamento; PROMPT_CODE_PAGAMENTI TASK 1/2, 01/09/2026)
 * — vivono in `app_config` (chiave-valore), inserite da
 * Alessio via SQL diretto, mai in env né nel repo. Lettura pubblica per RLS
 * ("app_config: lettura"), qualunque client autenticato/anon può leggerle —
 * è un secondo punto di verifica indipendente dall'email, non un segreto.
 * Opzionali: se assenti, l'email/il messaggio in-app chiede di contattare il
 * coach per le coordinate — nessun crash, stesso spirito di flags.ts.
 *
 * File a parte da ./status.ts (che resta senza "server-only"): questa
 * funzione richiede un SupabaseClient, il contratto del gate no — tenerli
 * insieme trascinerebbe "server-only" anche in `derivePaymentGate`,
 * importato pure da bundle client (payment-panel.tsx).
 */
export async function bankTransferDetails(
  supabase: SupabaseClient,
): Promise<BankTransferDetails | null> {
  const { data } = await supabase
    .from("app_config")
    .select("key, value")
    .in("key", ["payment_iban", "payment_intestatario"]);
  const iban = data?.find((r) => r.key === "payment_iban")?.value as
    | string
    | undefined;
  const holder = data?.find((r) => r.key === "payment_intestatario")?.value as
    | string
    | undefined;
  return iban?.trim() && holder?.trim()
    ? { iban: iban.trim(), holder: holder.trim() }
    : null;
}
