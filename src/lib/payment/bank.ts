import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BankTransferDetails = { iban: string; holder: string };

/**
 * Coordinate di bonifico (GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md §Canali e
 * regole di richiesta pagamento; PROMPT_CODE_PAGAMENTI TASK 1/2, 01/09/2026)
 * — vivono in `app_config` (chiave-valore), inserite da
 * Alessio via SQL diretto, mai in env né nel repo.
 *
 * ⚠️ ADR-018 (08/09/2026) — PASSA SOLO UN CLIENT ADMIN (service_role), o il
 * client del coach. La lettura NON è più pubblica: migration_057 restringe
 * `payment_iban`/`payment_intestatario` al solo coach, quindi con il client
 * RLS di un nuotatore (o di anon) questa funzione torna `null` — non è un
 * errore, è la regola. Fino a ieri erano leggibili da chiunque avesse la
 * chiave anon, cioè dal mondo: motivate come "secondo punto di verifica
 * indipendente dall'email", ma l'IBAN del coach è un suo dato personale e
 * quel beneficio non valeva il prezzo.
 *
 * Le coordinate escono dal sistema per una strada sola: l'email di
 * `./transfer-email.ts` (e quella di attivazione in `./request.ts`), a un
 * destinatario noto. Mai in una pagina, mai in una risposta JSON.
 *
 * Opzionali: se assenti, l'email non parte e il coach viene avvisato di
 * mandarle a mano — nessun crash, stesso spirito di flags.ts.
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
