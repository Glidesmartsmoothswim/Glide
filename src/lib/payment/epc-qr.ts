import "server-only";
import QRCode from "qrcode";

/**
 * QR EPC069-12 (bonifico SEPA a QR) — GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md
 * §Canali e regole di richiesta pagamento; PROMPT_CODE_PAGAMENTI TASK 3
 * (01/09/2026). Nessuna libreria Node con supporto nativo allo standard EPC
 * equivalente a `segno.helpers.make_epc_qr` (Python) — il payload è quindi
 * composto qui, a mano, seguendo alla lettera le 11 righe dello standard:
 *
 *   BCD / 002 / 1 / SCT / (BIC, vuoto) / [Intestatario] / [IBAN] /
 *   EUR[Importo] / (Purpose, vuoto) / (Riferimento strutturato, vuoto) /
 *   [Causale]
 *
 * Le due righe vuote prima della causale sono DUE campi distinti (purpose +
 * riferimento strutturato): un array con undici elementi, non dieci — è
 * l'errore che una versione precedente di questo prompt aveva commesso.
 * `qrcode` (npm) fa solo l'incapsulamento in immagine QR: non conosce lo
 * standard EPC, riceve il testo già pronto.
 *
 * Dinamico per transazione (mai un QR precotto/riusabile tra clienti):
 * IBAN/intestatario da app_config (fissi), importo e causale sono sempre
 * quelli specifici della richiesta corrente (TASK 4 — mai una tariffa
 * standard). Generazione interamente server-side, nessun servizio terzo: il
 * payload non lascia mai l'infrastruttura Supabase/Vercel.
 */
export type EpcPaymentInfo = {
  iban: string;
  holder: string;
  amountCents: number;
  causale: string;
};

/** Payload EPC069-12 a 11 righe, ordine fisso. */
export function buildEpcPayload({
  iban,
  holder,
  amountCents,
  causale,
}: EpcPaymentInfo): string {
  const amount = (amountCents / 100).toFixed(2);
  return [
    "BCD",
    "002",
    "1",
    "SCT",
    "", // BIC — opzionale, non richiesto per un bonifico nazionale IT
    holder.trim().slice(0, 70),
    iban.replace(/\s+/g, ""),
    `EUR${amount}`,
    "", // Purpose — non usato
    "", // Riferimento strutturato — non usato, la causale è in remittance libero
    causale.trim().slice(0, 140),
  ].join("\n");
}

/** SVG del QR, per embed diretto in una pagina server-rendered (nessun round-trip immagine). */
export async function epcQrSvg(info: EpcPaymentInfo): Promise<string> {
  return QRCode.toString(buildEpcPayload(info), {
    type: "svg",
    margin: 1,
    width: 220,
    errorCorrectionLevel: "M",
  });
}

/** PNG del QR come Buffer, per l'allegato inline dell'email (cid:). */
export async function epcQrPngBuffer(info: EpcPaymentInfo): Promise<Buffer> {
  return QRCode.toBuffer(buildEpcPayload(info), {
    type: "png",
    margin: 1,
    width: 300,
    errorCorrectionLevel: "M",
  });
}
