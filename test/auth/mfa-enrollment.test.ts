import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getMfaStatus,
  enrollTotp,
  verifyTotpCode,
  unenrollFactor,
  isAal2,
  checkMfaChallengeNeeded,
  type MfaClient,
} from "../../src/lib/mfa";

/**
 * PROMPT_CODE_COACH_MFA.md — FASE 1 (enrollment). Test contro un fake del
 * client `auth.mfa` di Supabase (nessun progetto live richiesto: qui si
 * verifica SOLO la logica di orchestrazione in `src/lib/mfa.ts`, non il
 * comportamento reale del server TOTP di Supabase).
 */

type FakeState = {
  factor: { id: string; status: "verified" | "unverified" } | null;
  currentLevel: "aal1" | "aal2";
};

const CHALLENGE_ID = "challenge-1";
const CORRECT_CODE = "123456";

function makeFakeMfaClient(opts: { preVerified?: boolean } = {}): {
  client: MfaClient;
  state: FakeState;
} {
  let nextId = 1;
  const state: FakeState = {
    factor: opts.preVerified ? { id: "factor-0", status: "verified" } : null,
    currentLevel: "aal1",
  };

  const client: MfaClient = {
    auth: {
      mfa: {
        async listFactors() {
          return {
            data: {
              totp: state.factor
                ? [{ id: state.factor.id, factor_type: "totp", status: state.factor.status }]
                : [],
            },
            error: null,
          };
        },
        async enroll() {
          const id = `factor-${nextId++}`;
          state.factor = { id, status: "unverified" };
          return {
            data: { id, totp: { qr_code: "data:image/svg+xml;base64,ZmFrZQ==", secret: "SECRETBASE32" } },
            error: null,
          };
        },
        async challenge({ factorId }) {
          if (!state.factor || state.factor.id !== factorId) {
            return { data: null, error: { message: "factor non trovato" } };
          }
          return { data: { id: CHALLENGE_ID }, error: null };
        },
        async verify({ factorId, challengeId, code }) {
          if (!state.factor || state.factor.id !== factorId || challengeId !== CHALLENGE_ID) {
            return { data: null, error: { message: "challenge non valida" } };
          }
          if (code !== CORRECT_CODE) {
            return { data: null, error: { message: "codice non valido" } };
          }
          state.factor.status = "verified";
          state.currentLevel = "aal2"; // come il vero Supabase: verify() eleva la sessione
          return { data: {}, error: null };
        },
        async unenroll({ factorId }) {
          if (!state.factor || state.factor.id !== factorId) {
            return { data: null, error: { message: "factor non trovato" } };
          }
          state.factor = null;
          return { data: {}, error: null };
        },
        async getAuthenticatorAssuranceLevel() {
          return { data: { currentLevel: state.currentLevel }, error: null };
        },
      },
    },
  };

  return { client, state };
}

test("enroll → verify con codice corretto → fattore risulta verified", async () => {
  const { client } = makeFakeMfaClient();

  const enrolled = await enrollTotp(client);
  assert.equal(enrolled.ok, true);
  if (!enrolled.ok) return;
  assert.ok(enrolled.factorId);
  assert.ok(enrolled.qrCode);
  assert.ok(enrolled.secret);

  const verified = await verifyTotpCode(client, enrolled.factorId, CORRECT_CODE);
  assert.deepEqual(verified, { ok: true });

  const status = await getMfaStatus(client);
  assert.equal(status.active, true);
  assert.equal(status.factor?.status, "verified");
});

test("verify con codice sbagliato → fattore resta unverified, nessun accesso concesso", async () => {
  const { client } = makeFakeMfaClient();

  const enrolled = await enrollTotp(client);
  assert.equal(enrolled.ok, true);
  if (!enrolled.ok) return;

  const result = await verifyTotpCode(client, enrolled.factorId, "000000");
  assert.equal(result.ok, false);

  const status = await getMfaStatus(client);
  assert.equal(status.active, false, "un codice sbagliato non deve attivare il fattore");

  const { data } = await client.auth.mfa.listFactors();
  assert.equal(data?.totp[0]?.status, "unverified");

  assert.equal(
    await isAal2(client),
    false,
    "un codice sbagliato non deve elevare la sessione ad aal2",
  );
});

test("listFactors dopo enrollment riuscito mostra il fattore", async () => {
  const { client } = makeFakeMfaClient();

  const enrolled = await enrollTotp(client);
  assert.equal(enrolled.ok, true);
  if (!enrolled.ok) return;
  await verifyTotpCode(client, enrolled.factorId, CORRECT_CODE);

  const { data, error } = await client.auth.mfa.listFactors();
  assert.equal(error, null);
  assert.equal(data?.totp.length, 1);
  assert.equal(data?.totp[0]?.id, enrolled.factorId);
  assert.equal(data?.totp[0]?.status, "verified");
});

test("unenroll richiede sessione aal2", async () => {
  // Fattore già verificato (da una sessione precedente), ma QUESTA sessione
  // non ha ancora fatto la challenge: aal1.
  const { client, state } = makeFakeMfaClient({ preVerified: true });
  assert.equal(await isAal2(client), false);

  const refused = await unenrollFactor(client, state.factor!.id);
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.equal(refused.needsStepUp, true);
  // Il fattore non deve essere stato toccato.
  assert.equal((await getMfaStatus(client)).active, true);

  // Step-up: verifica un codice adesso → la sessione sale ad aal2.
  const challenge = await client.auth.mfa.challenge({ factorId: state.factor!.id });
  assert.equal(challenge.error, null);
  const stepUp = await verifyTotpCode(client, state.factor!.id, CORRECT_CODE);
  assert.deepEqual(stepUp, { ok: true });
  assert.equal(await isAal2(client), true);

  // Ora l'unenroll deve riuscire.
  const done = await unenrollFactor(client, state.factor!.id);
  assert.deepEqual(done, { ok: true });
  assert.equal((await getMfaStatus(client)).active, false);
});

// Step di login mancante nel form originale (segnalato dall'utente): senza
// questo, dopo l'enforcement `is_coach() -> aal2`, un login con la sola
// password lascerebbe la sessione ad aal1 e nessuna schermata chiederebbe
// mai il codice — il coach si troverebbe l'accesso "rotto" in silenzio.
test("checkMfaChallengeNeeded: nessun fattore → nessuna challenge", async () => {
  const { client } = makeFakeMfaClient();
  assert.deepEqual(await checkMfaChallengeNeeded(client), { needed: false });
});

test("checkMfaChallengeNeeded: fattore verificato, sessione appena loggata (aal1) → serve la challenge", async () => {
  const { client, state } = makeFakeMfaClient({ preVerified: true });
  const result = await checkMfaChallengeNeeded(client);
  assert.deepEqual(result, { needed: true, factorId: state.factor!.id });
});

test("checkMfaChallengeNeeded: sessione già aal2 (challenge appena superata) → non richiesta di nuovo", async () => {
  const { client, state } = makeFakeMfaClient({ preVerified: true });
  await client.auth.mfa.challenge({ factorId: state.factor!.id });
  await verifyTotpCode(client, state.factor!.id, CORRECT_CODE);

  assert.deepEqual(await checkMfaChallengeNeeded(client), { needed: false });
});
