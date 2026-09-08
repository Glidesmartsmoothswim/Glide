import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serverFeatures } from "@/lib/flags";
import { getResend, emailFrom } from "@/lib/resend";
import { bankTransferDetails, type BankTransferDetails } from "./bank";
import { epcQrPngBuffer } from "./epc-qr";

/**
 * ADR-017 — Coordinate del bonifico per una SINGOLA lezione, via email.
 *
 * Le coordinate mostrate a schermo dopo la prenotazione si perdono al primo
 * cambio pagina: chi prenota dalla vasca paga stasera, non adesso. L'email è
 * la copia che resta, con lo stesso QR EPC069-12 già in uso per gli
 * abbonamenti (`request.ts`) — stessa struttura, stessa fonte per IBAN e
 * intestatario (`app_config`, mai in env né nel repo).
 *
 * Non lancia mai: una prenotazione valida non deve fallire perché l'email
 * non parte. L'esito torna al chiamante, che decide cosa dire al nuotatore e
 * se avvisare il coach — l'unica alternativa accettabile a una mail che non
 * parte è una persona che se ne accorge.
 */

export type TransferMailFailure =
  /** IBAN/intestatario non ancora in `app_config`: non c'è cosa mandare. */
  | "no_bank"
  /** Il nuotatore non ha un'email a cui scrivere. */
  | "no_email"
  /** RESEND_API_KEY assente: modalità simulata, come il resto dell'app. */
  | "no_resend"
  /** Resend ha rifiutato l'invio. */
  | "send_failed";

export type TransferMailOutcome = {
  sent: boolean;
  /** Presenti se configurate: servono anche alla UI, che le mostra a schermo. */
  bank: BankTransferDetails | null;
  /** Perché non è partita. `null` quando è partita. */
  failure: TransferMailFailure | null;
};

export async function sendBookingTransferEmail(
  admin: SupabaseClient,
  input: {
    to: string | null;
    firstName: string | null;
    serviceName: string;
    whenLabel: string;
    amountCents: number;
    causale: string;
  },
): Promise<TransferMailOutcome> {
  const bank = await bankTransferDetails(admin);
  if (!bank) return { sent: false, bank: null, failure: "no_bank" };
  if (!input.to) return { sent: false, bank, failure: "no_email" };
  if (!serverFeatures().resend)
    return { sent: false, bank, failure: "no_resend" };
  const resend = getResend();
  if (!resend) return { sent: false, bank, failure: "no_resend" };

  const importo = `€${(input.amountCents / 100).toFixed(2)}`;
  // Nessun QR se la generazione fallisce: l'email parte comunque con IBAN e
  // causale scritti, che sono il dato che serve davvero.
  const qrPng = await epcQrPngBuffer({
    iban: bank.iban,
    holder: bank.holder,
    amountCents: input.amountCents,
    causale: input.causale,
  }).catch(() => null);

  const { error } = (await resend.emails
    .send({
      from: emailFrom(),
      to: input.to,
      subject: `Prenotazione ricevuta — coordinate per il bonifico`,
      attachments: qrPng
        ? [
            {
              filename: "bonifico-qr.png",
              content: qrPng,
              contentType: "image/png",
              contentId: "epc-qr",
            },
          ]
        : undefined,
      html: `
      <div style="font-family:Arial,sans-serif;color:#0B1220;line-height:1.5">
        <h2 style="color:#0E5EAB">Ciao ${esc(input.firstName || "nuotatore")},</h2>
        <p>Abbiamo ricevuto la tua richiesta per <b>${esc(input.serviceName)}</b> — ${esc(input.whenLabel)}.</p>
        <p>È in attesa di conferma del coach. Per il saldo, bonifico di <b>${importo}</b>:</p>
        <p><b>IBAN:</b> ${esc(bank.iban)}<br/><b>Intestatario:</b> ${esc(bank.holder)}<br/><b>Causale:</b> ${esc(input.causale)}</p>
        ${qrPng ? `<p><img src="cid:epc-qr" alt="QR bonifico SEPA" width="220" height="220" /><br/><span style="color:#5b6b7b;font-size:12px">Inquadra con l'app della tua banca: importo e causale sono già precompilati.</span></p>` : ""}
        <p style="color:#5b6b7b;font-size:13px">Scrivi la causale così com'è: è quella che fa riconoscere il tuo bonifico senza doverlo chiedere.</p>
        <p style="color:#5b6b7b;font-size:13px">onda dopo onda 🌊</p>
      </div>`,
    })
    .catch(() => ({ error: { message: "invio fallito" } }))) ?? { error: null };

  return error
    ? { sent: false, bank, failure: "send_failed" }
    : { sent: true, bank, failure: null };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
