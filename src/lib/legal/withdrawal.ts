import "server-only";
import { headers } from "next/headers";
import { createHash } from "node:crypto";

/**
 * Prova server-side della rinuncia al recesso (glide-ext-recesso.md §3):
 * timestamp + hash IP, generati QUI — mai passati come li manda il client.
 *
 * Spostato da lib/stripe-checkout.ts (rimosso con ADR-014): non era mai
 * stato specifico di Stripe, solo ospitato lì. Stessa logica, invariata.
 */
export type WithdrawalWaiver = {
  waivedAt: string;
  ipHash: string | null;
};

export async function buildWithdrawalWaiver(): Promise<WithdrawalWaiver> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  return {
    waivedAt: new Date().toISOString(),
    ipHash: ip ? createHash("sha256").update(ip).digest("hex") : null,
  };
}

/** glide-ext-recesso.md §2/§4: senza la checkbox spuntata, niente richiesta. */
export function withdrawalWaived(fd: FormData): boolean {
  return fd.get("withdrawal_waived") === "on";
}
