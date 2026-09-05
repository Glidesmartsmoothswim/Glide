"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { markPurchasePaid } from "@/lib/payment/packages";

/**
 * ADR-016 (pacchetti) — "Segna pagato" del coach su un ordine pacchetto.
 * I token li emette il trigger `issue_package_tokens` sul DB, non questo
 * codice: è idempotente, quindi un doppio clic non raddoppia il credito.
 */
export async function markPackagePaid(
  swimmerId: string,
  purchaseId: string,
  receiptNumber?: string,
) {
  await requireRole("coach");
  const supabase = await createClient();
  const result = await markPurchasePaid(supabase, purchaseId, receiptNumber);
  if (result.error) return { error: result.error };
  revalidatePath(`/coach/nuotatori/${swimmerId}`);
  return { info: result.info };
}
