import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { serverFeatures } from "@/lib/flags";
import { createAdminClient } from "@/lib/supabase/admin";

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
      await admin.from("transactions").insert({
        swimmer_id: meta.swimmer_id ?? null,
        type: "subscription",
        amount_cents: amount,
        currency: s.currency ?? "eur",
        status: "succeeded",
        description: `Abbonamento ${meta.tier ?? ""}`.trim(),
      });
    }
  }

  return new Response("ok", { status: 200 });
}
