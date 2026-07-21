import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { serverFeatures } from "@/lib/flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { subTierToAccessTier } from "@/lib/stripe-checkout";

// Stripe SDK + verifica firma richiedono il runtime Node e nessuna cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook Stripe: sblocca i video (birra) e specchia gli abbonamenti.
 * Scrive con la service_role (bypassa RLS). Se webhook/stripe non
 * configurati, no-op 200: niente crash (feature flag).
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !serverFeatures().stripeWebhook || !secret) {
    return new Response("stripe non configurato (no-op)", { status: 200 });
  }

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig ?? "", secret);
  } catch (err) {
    return new Response(
      "firma non valida: " + (err instanceof Error ? err.message : ""),
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  if (!admin) return new Response("no admin", { status: 500 });

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const meta = s.metadata ?? {};
    const amount = s.amount_total ?? 0;

    if (meta.type === "birra" && meta.video_id) {
      await admin
        .from("race_videos")
        .update({ paid: true, status: "pending" })
        .eq("id", meta.video_id);
      await admin.from("transactions").insert({
        swimmer_id: meta.swimmer_id ?? null,
        type: "birra",
        video_id: meta.video_id,
        stripe_payment_intent_id: (s.payment_intent as string) ?? null,
        amount_cents: amount,
        currency: s.currency ?? "eur",
        status: "succeeded",
        description: "Sblocco analisi video",
      });
    } else if (meta.type === "subscription") {
      await admin.from("subscriptions").upsert(
        {
          swimmer_id: meta.swimmer_id ?? null,
          stripe_customer_id: (s.customer as string) ?? null,
          stripe_subscription_id: (s.subscription as string) ?? null,
          tier: meta.tier ?? null,
          price_cents: amount,
          status: "active",
        },
        { onConflict: "stripe_subscription_id" },
      );
      // Onda 12.1: abbonamento attivo → aggiorna il tier di accesso.
      // Non tocca chi è one_to_one (percorso dedicato assegnato dal coach).
      if (meta.swimmer_id) {
        await admin
          .from("profiles")
          .update({ tier: subTierToAccessTier(meta.tier) })
          .eq("id", meta.swimmer_id)
          .neq("tier", "one_to_one");
      }
      await admin.from("transactions").insert({
        swimmer_id: meta.swimmer_id ?? null,
        type: "subscription",
        amount_cents: amount,
        currency: s.currency ?? "eur",
        status: "succeeded",
        description: `Abbonamento ${meta.tier ?? ""}`.trim(),
      });
    } else if (meta.type === "season" && meta.swimmer_id) {
      // 1:1 stagionale (one-off): tier one_to_one fino a fine giugno; poi il
      // job pg_cron giornaliero lo riporta a free.
      await admin
        .from("profiles")
        .update({
          tier: "one_to_one",
          tier_expires_at: meta.season_end ?? null,
        })
        .eq("id", meta.swimmer_id);
      await admin.from("transactions").insert({
        swimmer_id: meta.swimmer_id,
        type: "subscription",
        amount_cents: amount,
        currency: s.currency ?? "eur",
        status: "succeeded",
        description: "Percorso 1:1 stagionale",
      });
    }
  } else if (
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.updated"
  ) {
    // Onda 12.1: abbonamento cancellato/non pagante → il tier torna a free.
    const sub = event.data.object as Stripe.Subscription;
    const ended =
      sub.status === "canceled" ||
      sub.status === "unpaid" ||
      sub.status === "incomplete_expired";
    const { data: row } = await admin
      .from("subscriptions")
      .update({ status: sub.status })
      .eq("stripe_subscription_id", sub.id)
      .select("swimmer_id")
      .maybeSingle();
    if (ended && row?.swimmer_id) {
      // Non declassa un one_to_one (lo gestisce il coach, non Stripe).
      await admin
        .from("profiles")
        .update({ tier: "free" })
        .eq("id", row.swimmer_id)
        .neq("tier", "one_to_one");
    }
  }

  return new Response("ok", { status: 200 });
}
