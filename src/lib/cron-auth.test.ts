import { test } from "node:test";
import assert from "node:assert/strict";
import { cronAuthorized } from "./cron-auth";

const req = (auth?: string) =>
  new Request(
    "https://x/api/cron",
    auth ? { headers: { authorization: auth } } : {},
  );

test("cron: nega se CRON_SECRET non è configurato (fail-closed)", () => {
  delete process.env.CRON_SECRET;
  assert.equal(cronAuthorized(req("Bearer qualcosa")), false);
});

test("cron: header assente o errato → nega; corretto → consente", () => {
  process.env.CRON_SECRET = "s3cr3t-lungo-per-il-test";
  assert.equal(cronAuthorized(req()), false); // nessun header
  assert.equal(cronAuthorized(req("Bearer sbagliato")), false); // errato
  assert.equal(cronAuthorized(req("Bearer s3cr3t-lungo-per-il-test")), true);
});
