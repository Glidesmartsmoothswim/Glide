import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serverFeatures } from "@/lib/flags";
import { getResend, emailFrom } from "@/lib/resend";
import { fullName } from "@/lib/types";
import { notifyCoaches, notifyUser } from "@/lib/notify";
import {
  TIER_PRICE_CENTS,
  TIER_LABEL,
  subTierToAccessTier,
  expiryFor,
  type SubTier,
} from "./pricing";
import { bankTransferDetails } from "./bank";
import { epcQrPngBuffer } from "./epc-qr";
import { paymentRequestCopy, paymentCausale } from "./message";
import type { WithdrawalWaiver } from "@/lib/legal/withdrawal";

export type RequestResult = { error?: string; info?: string };

/**
 * ADR-014 A.3 — "Richiedi attivazione": crea l'entitlement in stato
 * `pending_payment` (nessun accesso attivo finché il coach non segna
 * pagato) e avvisa via email le coordinate di bonifico. Se RESEND_API_KEY
 * non è configurata: modalità simulata, nessun crash (stesso pattern di
 * lib/coach/create-swimmer.ts).
 */
export async function requestActivation(
  admin: SupabaseClient,
  swimmer: { id: string; email: string | null; firstName: string | null },
  tier: SubTier,
  waiver: WithdrawalWaiver,
  opts?: {
    // 1:1 Elite (GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md): prezzo calcolato da
    // questionario, non il fisso di TIER_PRICE_CENTS. `detail` è SOLO
    // display (coach/email) — il prezzo è quello ricalcolato server-side
    // dal chiamante, mai fidandosi di un valore mandato dal client.
    amountCentsOverride?: number;
    detail?: string;
  },
): Promise<RequestResult> {
  const amountCents = opts?.amountCentsOverride ?? TIER_PRICE_CENTS[tier];

  const { error } = await admin
    .from("profiles")
    .update({
      requested_tier: tier,
      requested_tier_detail: opts?.detail ?? null,
      payment_status: "pending_payment",
      payment_amount_cents: amountCents,
      payment_method: "cash",
      withdrawal_waived_at: waiver.waivedAt,
      withdrawal_waiver_ip_hash: waiver.ipHash,
    })
    .eq("id", swimmer.id);
  if (error) return { error: error.message };

  await notifyCoaches(
    "pay",
    "Richiesta attivazione piano",
    `${fullName({ first_name: swimmer.firstName, last_name: null, email: swimmer.email })} — ${opts?.detail ?? TIER_LABEL[tier]} · €${(amountCents / 100).toFixed(2)}`,
  );

  if (!serverFeatures().resend || !swimmer.email) {
    return {
      info: "Richiesta inviata al coach. Email in modalità simulata: ti contatterà lui per le coordinate.",
    };
  }

  const resend = getResend();
  // TASK 1/2 (app_config, non più env) + TASK 4 (mai assumere: la copy
  // distingue pagamento unico stagione da canone mensile leggendo
  // `tier`/`requested_tier`, non un testo fisso).
  const bank = await bankTransferDetails(admin);
  const swimmerFullName = fullName({
    first_name: swimmer.firstName,
    last_name: null,
    email: swimmer.email,
  });
  const causale = paymentCausale(swimmerFullName, swimmer.id);
  const { headline } = paymentRequestCopy(tier);

  // TASK 3 — QR EPC069-12 dinamico per questa transazione (IBAN/intestatario
  // fissi da app_config, importo/causale specifici di questa richiesta).
  // Nessun QR se l'IBAN non è configurato: l'email cade sul messaggio
  // "il coach ti contatterà" come già faceva prima di questo task.
  const qrPng = bank
    ? await epcQrPngBuffer({
        iban: bank.iban,
        holder: bank.holder,
        amountCents,
        causale,
      })
    : null;

  const { error: mailError } = (await resend!.emails.send({
    from: emailFrom(),
    to: swimmer.email,
    subject: `Richiesta di attivazione — ${TIER_LABEL[tier]}`,
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
        <h2 style="color:#0E5EAB">Ciao ${swimmer.firstName || "nuotatore"},</h2>
        <p>Abbiamo ricevuto la tua richiesta di attivazione per <b>${opts?.detail ?? TIER_LABEL[tier]}</b>.</p>
        <p><b>${headline}</b> — Importo: €${(amountCents / 100).toFixed(2)}</p>
        ${
          bank
            ? `<p><b>IBAN:</b> ${bank.iban}<br/><b>Intestatario:</b> ${bank.holder}<br/><b>Causale:</b> ${causale}</p>
               ${qrPng ? `<p><img src="cid:epc-qr" alt="QR bonifico SEPA" width="220" height="220" /><br/><span style="color:#5b6b7b;font-size:12px">Inquadra con l'app della tua banca: importo e causale sono già precompilati.</span></p>` : ""}`
            : `<p>Il coach ti contatterà a breve con le coordinate per il bonifico.</p>`
        }
        <p>Appena il coach registra l'incasso, il piano si attiva automaticamente — nessun'altra azione richiesta da parte tua.</p>
        <p style="color:#5b6b7b;font-size:13px">onda dopo onda 🌊</p>
      </div>`,
  })) ?? { error: null };

  if (mailError)
    return {
      info: "Richiesta registrata, ma l'invio email è fallito. Il coach ti contatterà comunque.",
    };
  return { info: "Richiesta inviata: controlla la mail per i dettagli del bonifico." };
}

/**
 * ADR-014 A.7 — Fatturazione verso Fatture in Cloud: prima il trigger era
 * l'evento Stripe (webhook), ora è l'azione "segna pagato" del coach. Nessuna
 * integrazione reale in questo repo (nessuna chiave/API Fatture in Cloud
 * configurata) — punto di innesto unico e documentato, no-op finché non
 * viene collegata: non blocca né fallisce mai `markPaid`.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- firma del futuro hook Fatture in Cloud, tenuta esplicita anche da no-op.
function triggerInvoicing(input: {
  swimmerId: string;
  tier: SubTier;
  amountCents: number;
  receiptNumber: string | null;
}): void {
  // TODO(Fatture in Cloud): quando l'integrazione sarà collegata, generare
  // qui la fattura/ricevuta verso input.swimmerId. Per ora resta un hook
  // documentato, coerente con "trigger opzionale" di ADR-014.
}

/**
 * ADR-014 A.4 — "Segna pagato": il coach conferma l'incasso fuori
 * piattaforma. Attiva il tier, estende il periodo da ORA (non dalla vecchia
 * scadenza: un rinnovo tardivo non "recupera" i giorni persi in overdue).
 */
export async function markPaid(
  admin: SupabaseClient,
  swimmerId: string,
  input: {
    tier?: SubTier; // se assente, usa profiles.requested_tier
    amountCents?: number; // se assente, usa profiles.payment_amount_cents
    receiptNumber?: string | null;
    // 1:1 Elite (fatturazione mensile/bimestrale): sostituisce l'estensione
    // di 1 mese di default con N mesi. Assente per gli altri piani.
    periodMonths?: number;
  },
): Promise<RequestResult> {
  const { data: p } = await admin
    .from("profiles")
    .select(
      "requested_tier, requested_tier_detail, payment_amount_cents, first_name, last_name, email",
    )
    .eq("id", swimmerId)
    .maybeSingle();
  const tier = (input.tier ?? p?.requested_tier) as SubTier | null;
  if (!tier) return { error: "Nessun piano richiesto per questo nuotatore." };

  const amountCents = input.amountCents ?? p?.payment_amount_cents ?? TIER_PRICE_CENTS[tier];
  const now = new Date();
  const expiresAt = input.periodMonths
    ? new Date(now.getFullYear(), now.getMonth() + input.periodMonths, now.getDate())
    : expiryFor(tier, now);

  const { error } = await admin
    .from("profiles")
    .update({
      tier: subTierToAccessTier(tier),
      tier_expires_at: expiresAt.toISOString(),
      requested_tier: null,
      // PROMPT_CODE_PAGAMENTI TASK 6 (01/09/2026): NON azzerare più questo
      // campo qui. Resta come descrizione "solo display" della tipologia
      // 1:1 attiva (allenamenti/sett + cadenza + canale) — è quello che il
      // profilo/gestionale mostra nel blocco "Tipologia abbonamento" per i
      // tier one_to_one (migration_044: "solo display, mai usata per
      // calcoli"). Viene sovrascritto dalla richiesta successiva, se ce
      // n'è una.
      payment_status: "paid",
      payment_amount_cents: amountCents,
      payment_method: "cash",
      receipt_number: input.receiptNumber?.trim() || null,
      paid_at: now.toISOString(),
    })
    .eq("id", swimmerId);
  if (error) return { error: error.message };

  // Business/Ricavi (src/app/coach/business/page.tsx, v_monthly_revenue):
  // legge SOLO `transactions` — senza questa riga un incasso manuale non
  // comparirebbe mai nei ricavi. Stesso schema/tipo che scriveva il vecchio
  // webhook Stripe su checkout.session.completed (type='subscription').
  await admin.from("transactions").insert({
    swimmer_id: swimmerId,
    type: "subscription",
    amount_cents: amountCents,
    currency: "eur",
    status: "succeeded",
    description: p?.requested_tier_detail || `${TIER_LABEL[tier]} — incasso manuale`,
  });

  triggerInvoicing({
    swimmerId,
    tier,
    amountCents,
    receiptNumber: input.receiptNumber?.trim() || null,
  });

  await notifyUser(
    swimmerId,
    "pay",
    "Piano attivato ✅",
    `${TIER_LABEL[tier]} confermato — buon allenamento!`,
  );
  return { info: `${TIER_LABEL[tier]} attivato.` };
}
