/**
 * MFA (TOTP) sull'account — GDPR/sicurezza generica, non "una feature per il
 * coach" (PROMPT_CODE_COACH_MFA.md, FASE 1). Chiunque loggato può attivarla.
 *
 * Logica pura, senza React né DOM: prende in ingresso un client con la stessa
 * forma di `SupabaseClient["auth"]["mfa"]` (soddisfatta strutturalmente dal
 * client reale), così è testabile con un fake sincrono, senza un progetto
 * Supabase live. La UI (`components/account/mfa-settings.tsx`) è un guscio
 * sottile sopra queste funzioni.
 */

export type MfaFactor = {
  id: string;
  factor_type: string;
  status: "verified" | "unverified";
};

type MfaResult<T> = { data: T | null; error: { message: string } | null };

/** Sottoinsieme di `SupabaseClient["auth"]["mfa"]` usato qui. */
export interface MfaClient {
  auth: {
    mfa: {
      listFactors(): Promise<MfaResult<{ totp: MfaFactor[] }>>;
      enroll(params: {
        factorType: "totp";
      }): Promise<MfaResult<{ id: string; totp: { qr_code: string; secret: string } }>>;
      challenge(params: { factorId: string }): Promise<MfaResult<{ id: string }>>;
      verify(params: {
        factorId: string;
        challengeId: string;
        code: string;
      }): Promise<MfaResult<unknown>>;
      unenroll(params: { factorId: string }): Promise<MfaResult<unknown>>;
      getAuthenticatorAssuranceLevel(): Promise<MfaResult<{ currentLevel: string | null }>>;
    };
  };
}

export type MfaStatus = { active: boolean; factor: MfaFactor | null };

/** Stato attuale: c'è un fattore TOTP verificato? */
export async function getMfaStatus(client: MfaClient): Promise<MfaStatus> {
  const { data } = await client.auth.mfa.listFactors();
  const factor = data?.totp.find((f) => f.status === "verified") ?? null;
  return { active: Boolean(factor), factor };
}

export type EnrollResult =
  | { ok: true; factorId: string; qrCode: string; secret: string }
  | { ok: false; error: string };

/** Avvia l'enrollment: genera QR code + secret, fattore resta `unverified`. */
export async function enrollTotp(client: MfaClient): Promise<EnrollResult> {
  const { data, error } = await client.auth.mfa.enroll({ factorType: "totp" });
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Impossibile avviare l'attivazione." };
  }
  return {
    ok: true,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export type VerifyResult = { ok: true } | { ok: false; error: string };

/**
 * Conferma il codice a 6 cifre: apre una challenge e la verifica.
 * Se il codice è sbagliato il fattore resta `unverified` — nessun accesso in
 * più viene concesso (la sessione non sale ad aal2).
 */
export async function verifyTotpCode(
  client: MfaClient,
  factorId: string,
  code: string,
): Promise<VerifyResult> {
  const { data: challenge, error: challengeError } = await client.auth.mfa.challenge({
    factorId,
  });
  if (challengeError || !challenge) {
    return {
      ok: false,
      error: challengeError?.message ?? "Impossibile inviare la richiesta di verifica.",
    };
  }
  const { error } = await client.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (error) return { ok: false, error: "Codice non valido. Riprova." };
  return { ok: true };
}

/** true solo se QUESTA sessione ha già superato una verifica MFA (aal2). */
export async function isAal2(client: MfaClient): Promise<boolean> {
  const { data } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel === "aal2";
}

export type UnenrollResult =
  | { ok: true }
  | { ok: false; error: string; needsStepUp?: boolean };

/**
 * Disattiva la 2FA — ma solo se la sessione corrente è già aal2. Altrimenti
 * rifiuta (`needsStepUp: true`): la UI propone di verificare un codice ora
 * (senza serve un nuovo login) prima di riprovare.
 */
export async function unenrollFactor(
  client: MfaClient,
  factorId: string,
): Promise<UnenrollResult> {
  if (!(await isAal2(client))) {
    return {
      ok: false,
      needsStepUp: true,
      error: "Per disattivare la 2FA devi prima verificare un codice in questa sessione.",
    };
  }
  const { error } = await client.auth.mfa.unenroll({ factorId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
