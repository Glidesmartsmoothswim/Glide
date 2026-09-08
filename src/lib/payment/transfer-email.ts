import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serverFeatures } from "@/lib/flags";
import { getResend, emailFrom } from "@/lib/resend";
import { bankTransferDetails, type BankTransferDetails } from "./bank";
import { epcQrPngBuffer } from "./epc-qr";

/**
 * ADR-018 — Le coordinate di incasso viaggiano SOLO per email, a una persona
 * sola, mai a schermo dentro l'app.
 *
 * L'IBAN del coach è un suo dato personale: dentro l'app sarebbe esposto a
 * chiunque entri con un account (o, prima di ADR-018, a chiunque avesse la
 * chiave anon — cioè al mondo). Un'email è una comunicazione privata a un
 * destinatario noto, con la responsabilità sul canale di posta. Nessun
 * componente client riceve più IBAN/intestatario: passano da qui, con il
 * client ADMIN (service_role), e finiscono solo nel corpo del messaggio.
 *
 * Vale per tutti i flussi che prima mostravano il riquadro a video:
 * prenotazione di una lezione a bonifico e acquisto di un pacchetto. Il
 * QR EPC069-12 contiene l'IBAN in chiaro, quindi segue la stessa regola:
 * solo nell'email, mai nella pagina.
 *
 * Non lancia mai: una prenotazione o un ordine validi non devono fallire
 * perché l'email non parte. L'esito torna al chiamante, che decide cosa dire
 * e se avvisare il coach — l'unica alternativa accettabile a una mail che non
 * parte è una persona che se ne accorge.
 */

export type TransferMailFailure =
  /** IBAN/intestatario non ancora in `app_config`: non c'è cosa mandare. */
  | "no_bank"
  /** Il destinatario non ha un'email a cui scrivere. */
  | "no_email"
  /** RESEND_API_KEY assente: modalità simulata, come il resto dell'app. */
  | "no_resend"
  /** Resend ha rifiutato l'invio. */
  | "send_failed";

export type TransferMailOutcome = {
  sent: boolean;
  /** Perché non è partita. `null` quando è partita. */
  failure: TransferMailFailure | null;
};

/**
 * NB: il valore di ritorno NON contiene le coordinate, di proposito. Prima le
 * restituiva, e da lì finivano nella risposta JSON della route e poi a video:
 * è esattamente la strada che ADR-018 chiude.
 */
export async function sendTransferCoordinates(
  admin: SupabaseClient,
  input: {
    to: string | null;
    firstName: string | null;
    subject: string;
    /** Che cosa si sta pagando, già scritto in italiano ("la lezione …"). */
    intro: string;
    amountCents: number;
    causale: string;
  },
): Promise<TransferMailOutcome> {
  const bank: BankTransferDetails | null = await bankTransferDetails(admin);
  if (!bank) return { sent: false, failure: "no_bank" };
  if (!input.to) return { sent: false, failure: "no_email" };
  if (!serverFeatures().resend) return { sent: false, failure: "no_resend" };
  const resend = getResend();
  if (!resend) return { sent: false, failure: "no_resend" };

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
      subject: input.subject,
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
        <p>${esc(input.intro)}</p>
        <p>Per il saldo, bonifico di <b>${importo}</b>:</p>
        <p><b>IBAN:</b> ${esc(bank.iban)}<br/><b>Intestatario:</b> ${esc(bank.holder)}<br/><b>Causale:</b> ${esc(input.causale)}</p>
        ${qrPng ? `<p><img src="cid:epc-qr" alt="QR bonifico SEPA" width="220" height="220" /><br/><span style="color:#5b6b7b;font-size:12px">Inquadra con l'app della tua banca: importo e causale sono già precompilati.</span></p>` : ""}
        <p style="color:#5b6b7b;font-size:13px">Scrivi la causale così com'è: è quella che fa riconoscere il tuo bonifico senza doverlo chiedere.</p>
        <p style="color:#5b6b7b;font-size:13px">onda dopo onda 🌊</p>
      </div>`,
    })
    .catch(() => ({ error: { message: "invio fallito" } }))) ?? { error: null };

  return error
    ? { sent: false, failure: "send_failed" }
    : { sent: true, failure: null };
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
