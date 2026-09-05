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
  input: {
    tier?: SubTier | "";
    amountEuro?: string;
    receiptNumber?: string;
    // 1:1 Elite fatturato ogni 2 mesi (GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md):
    // il coach conferma quanti mesi copre l'incasso ricevuto — è la fonte di
    // verità, non un valore ricordato dalla richiesta originale.
    periodMonths?: number;
    /** ADR-016 Task 3 — scadenza scelta dal coach (yyyy-mm-dd), obbligatoria. */
    expiresAt?: string;
  },
) {
  await requireRole("coach");
  const supabase = await createClient();
  const amountCents = input.amountEuro
    ? Math.round(Number(input.amountEuro.replace(",", ".")) * 100)
    : undefined;
  if (amountCents != null && (!Number.isFinite(amountCents) || amountCents <= 0))
    return { error: "Importo non valido." };

  // ADR-016 Task 3 — senza scadenza il gate cade su `due` e si ricrea
  // esattamente il bug dei tre profili bloccati: qui è obbligatoria.
  if (!input.expiresAt)
    return { error: "Indica la data di scadenza: senza, il piano resta bloccato." };

  const result = await markPaid(supabase, swimmerId, {
    tier: input.tier || undefined,
    amountCents,
    receiptNumber: input.receiptNumber,
    periodMonths: input.periodMonths,
    expiresAt: input.expiresAt,
  });
  if (result.error) return { error: result.error };
  revalidatePath(`/coach/nuotatori/${swimmerId}`);
  revalidatePath("/coach/nuotatori");
  return { info: result.info };
}
