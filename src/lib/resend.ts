import "server-only";
import { Resend } from "resend";
import { serverFeatures } from "@/lib/flags";

/**
 * Resend lato SERVER, inizializzato in modo LAZY.
 * Ritorna null quando la chiave non è configurata → email "simulata".
 */
let _resend: Resend | null = null;

export function getResend(): Resend | null {
  if (!serverFeatures().resend) return null;
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY!);
  }
  return _resend;
}

/** Mittente predefinito delle email. */
export function emailFrom() {
  return process.env.EMAIL_FROM ?? "onda@glide.swim";
}
