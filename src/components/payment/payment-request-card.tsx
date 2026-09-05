import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { bankTransferDetails } from "@/lib/payment/bank";
import { epcQrSvg } from "@/lib/payment/epc-qr";
import { paymentRequestCopy, paymentCausale } from "@/lib/payment/message";
import { TIER_LABEL, type SubTier } from "@/lib/payment/pricing";

const euro = (cents: number) =>
  `€ ${(cents / 100).toLocaleString("it-IT", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * PROMPT_CODE_PAGAMENTI TASK 2/3/4 (01/09/2026) — "sezione pagamento" del
 * profilo cliente autenticato E schermata "richiedi attivazione"
 * (/app/abbonamenti): stesso blocco in entrambi i posti, un solo punto di
 * verità.
 *  - TASK 2: IBAN + intestatario da app_config (sola lettura).
 *  - TASK 4: testo/importo SEMPRE da payment_amount_cents/requested_tier
 *    del profilo (mai una tariffa standard calcolata a formula).
 *  - TASK 3: QR EPC069-12 dinamico per questa transazione (IBAN fisso,
 *    importo/causale specifici della richiesta corrente) — generato
 *    server-side, nessun servizio terzo.
 */
export async function PaymentRequestCard({
  requestedTier,
  requestedTierDetail,
  amountCents,
  fullName,
  profileId,
}: {
  requestedTier: SubTier;
  requestedTierDetail: string | null;
  amountCents: number;
  fullName: string;
  profileId: string;
}) {
  return (
    <BankTransferCard
      title={requestedTierDetail || TIER_LABEL[requestedTier]}
      headline={paymentRequestCopy(requestedTier).headline}
      amountCents={amountCents}
      fullName={fullName}
      profileId={profileId}
    />
  );
}

/**
 * ADR-016 (pacchetti) — stesso blocco IBAN/causale/QR, ma con titolo e
 * sottotitolo liberi: serve identico per l'acquisto di un pacchetto lezioni,
 * che non è un tier. Generalizzato invece di duplicato, come chiede il
 * documento ("stessa resa già usata per l'attivazione abbonamento, da
 * riusare senza duplicare").
 */
export async function BankTransferCard({
  title,
  headline,
  amountCents,
  fullName,
  profileId,
}: {
  title: string;
  headline: string;
  amountCents: number;
  fullName: string;
  profileId: string;
}) {
  const supabase = await createClient();
  const bank = await bankTransferDetails(supabase);
  const causale = paymentCausale(fullName, profileId);
  const svg = bank
    ? await epcQrSvg({ iban: bank.iban, holder: bank.holder, amountCents, causale })
    : null;

  return (
    <Card className="flex flex-col gap-3 text-sm text-blu">
      <div>
        <p className="font-bold text-foreground">{title}</p>
        <p>
          {headline} · <span className="font-bold">{euro(amountCents)}</span>
        </p>
      </div>

      {bank ? (
        <>
          <div className="flex flex-col gap-1 border-t border-border pt-3">
            <div className="flex justify-between">
              <span className="text-muted">IBAN</span>
              <span className="font-semibold text-foreground">{bank.iban}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Intestatario</span>
              <span className="font-semibold text-foreground">{bank.holder}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="shrink-0 text-muted">Causale</span>
              <span className="text-right font-semibold text-foreground">{causale}</span>
            </div>
          </div>
          {svg && (
            <div className="flex flex-col items-center gap-1.5 border-t border-border pt-3">
              <div
                className="rounded-lg bg-white p-2"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <p className="text-center text-xs text-muted">
                Inquadra con l&apos;app della tua banca: bonifico SEPA con
                importo e causale già precompilati.
              </p>
            </div>
          )}
        </>
      ) : (
        <p className="border-t border-border pt-3 text-muted">
          Il coach ti contatterà a breve con le coordinate per il bonifico.
        </p>
      )}
    </Card>
  );
}
