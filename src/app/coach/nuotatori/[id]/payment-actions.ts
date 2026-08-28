"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { markPaid } from "@/lib/payment/request";
import type { SubTier } from "@/lib/payment/pricing";

/**
 * ADR-014 A.4 — "Segna pagato": il coach conferma l'incasso manuale
 * (data/importo impliciti in `paid_at`/`amountCents`, metodo sempre `cash`).
 * Passa dal client RLS del coach (non admin): la policy "profili: modifica
 * propria o coach" + il trigger protect_payment_columns (migration_043)
 * ammettono già is_coach() esplicitamente.
 */
export async function markSwimmerPaid(
  swimmerId: string,
  input: { tier?: SubTier | ""; amountEuro?: string; receiptNumber?: string },
) {
  await requireRole("coach");
  const supabase = await createClient();
  const amountCents = input.amountEuro
    ? Math.round(Number(input.amountEuro.replace(",", ".")) * 100)
    : undefined;
  if (amountCents != null && (!Number.isFinite(amountCents) || amountCents <= 0))
    return { error: "Importo non valido." };

  const result = await markPaid(supabase, swimmerId, {
    tier: input.tier || undefined,
    amountCents,
    receiptNumber: input.receiptNumber,
  });
  if (result.error) return { error: result.error };
  revalidatePath(`/coach/nuotatori/${swimmerId}`);
  revalidatePath("/coach/nuotatori");
  return { info: result.info };
}
