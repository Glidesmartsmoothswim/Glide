import "server-only";
import { Resend } from "resend";
import { getServerEnv } from "@/lib/env";

/**
 * Client Resend per le email transazionali. Solo lato server.
 */
export const resend = new Resend(getServerEnv().RESEND_API_KEY);

/** Mittente predefinito delle email (dominio verificato su Resend). */
export function emailFrom() {
  return getServerEnv().EMAIL_FROM;
}
