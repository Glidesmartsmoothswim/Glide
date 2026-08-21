import { test, mock, before } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";

// L'import di ./route trascina @/lib/env, che fa un parse zod EAGER di
// process.env al momento dell'import: le var vanno impostate PRIMA di
// importare il modulo, quindi qui sotto e con import dinamico (non statico).
process.env.NEXT_PUBLIC_APP_URL = "https://glide.example";
process.env.NEXT_PUBLIC_APP_NAME = "GLIDE (test)";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test1234.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-test-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test-key";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_dummy_secret";

let POST: typeof import("./route").POST;
before(async () => {
  ({ POST } = await import("./route"));
});

const SWIMMER_ID = "11111111-1111-1111-1111-111111111111";

/** Costruisce una richiesta webhook Stripe firmata correttamente (offline, no network). */
function signedWebhookRequest(eventId: string, metaType: string, extraMeta: Record<string, string> = {}) {
  const payload = JSON.stringify({
    id: eventId,
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_123",
        amount_total: 69000,
        currency: "eur",
        payment_intent: "pi_test_123",
        customer: "cus_test_123",
        subscription: null,
        metadata: { type: metaType, swimmer_id: SWIMMER_ID, ...extraMeta },
      },
    },
  });
  const header = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  return new Request("https://glide.example/api/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": header },
    body: payload,
  });
}

/** Fake minimale di fetch per intercettare le chiamate REST di supabase-js. */
function installFakeFetch(opts: { profilesUpdateFails: boolean }) {
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => {
    const url = input.toString();
    if (url.includes("/rest/v1/stripe_events")) {
      calls.push("stripe_events.insert");
      return new Response("[]", {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/rest/v1/profiles")) {
      calls.push("profiles.update");
      if (opts.profilesUpdateFails) {
        // Riproduce l'errore reale atteso finché migration_023 resta in
        // sospeso: la colonna tier_expires_at non esiste sul DB live.
        return new Response(
          JSON.stringify({
            code: "42703",
            message:
              'column "tier_expires_at" of relation "profiles" does not exist',
            details: null,
            hint: null,
          }),
          { status: 400, headers: { "content-type": "application/json" } },
        );
      }
      return new Response("[]", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/rest/v1/transactions")) {
      calls.push("transactions.insert");
      return new Response("[]", {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }
    throw new Error("fetch non atteso nel test: " + init?.method + " " + url);
  }) as typeof fetch;
  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

test("webhook: update tier one_to_one fallito → logga l'errore ED evita il 200 (Stripe deve ritentare)", async () => {
  const fake = installFakeFetch({ profilesUpdateFails: true });
  const errorLogs: unknown[] = [];
  const consoleErrorMock = mock.method(console, "error", (...args: unknown[]) => {
    errorLogs.push(args[0]);
  });

  try {
    const eventId = "evt_test_season_fail_1";
    const req = signedWebhookRequest(eventId, "season", {
      season_end: "2027-06-30",
    });
    const res = await POST(req);

    // 1) La risposta HTTP NON deve essere 200: Stripe deve ritentare invece
    //    di considerare l'evento gestito.
    assert.notEqual(res.status, 200);
    assert.equal(res.status, 500);

    // 2) L'errore va loggato in modo esplicito (non silenzioso), con
    //    l'event.id Stripe associato.
    assert.equal(errorLogs.length, 1);
    const logged = JSON.parse(errorLogs[0] as string);
    assert.equal(logged.stripe_event_id, eventId);
    assert.equal(logged.swimmer_id, SWIMMER_ID);
    assert.equal(logged.error_code, "42703");

    // 3) L'update a profiles è stato tentato, ma la transazione collegata
    //    NON va registrata come "succeeded" se il tier non si è sbloccato.
    assert.ok(fake.calls.includes("profiles.update"));
    assert.ok(!fake.calls.includes("transactions.insert"));
  } finally {
    consoleErrorMock.mock.restore();
    fake.restore();
  }
});

test("webhook: update tier one_to_one riuscito → 200, nessun log d'errore", async () => {
  const fake = installFakeFetch({ profilesUpdateFails: false });
  const errorLogs: unknown[] = [];
  const consoleErrorMock = mock.method(console, "error", (...args: unknown[]) => {
    errorLogs.push(args[0]);
  });

  try {
    const req = signedWebhookRequest("evt_test_season_ok_1", "season", {
      season_end: "2027-06-30",
    });
    const res = await POST(req);

    assert.equal(res.status, 200);
    assert.equal(errorLogs.length, 0);
    assert.ok(fake.calls.includes("profiles.update"));
    assert.ok(fake.calls.includes("transactions.insert"));
  } finally {
    consoleErrorMock.mock.restore();
    fake.restore();
  }
});
