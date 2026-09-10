// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { Card } from "@/components/ui/card";
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
 *  - TASK 4: testo/importo SEMPRE da payment_amount_cents/requested_tier
 *    del profilo (mai una tariffa standard calcolata a formula).
 *
 * ADR-018 — IBAN, intestatario e QR NON stanno più qui: il QR contiene
 * l'IBAN in chiaro, quindi seguiva la stessa strada del testo. Le coordinate
 * viaggiano solo per email (`lib/payment/transfer-email.ts`), a un
 * destinatario noto. Qui restano importo e causale, che sono dati della
 * transazione del nuotatore, non del conto del coach.
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
  const causale = paymentCausale(fullName, profileId);

  return (
    <Card className="flex flex-col gap-3 text-sm text-blu">
      <div>
        <p className="font-bold text-foreground">{title}</p>
        <p>
          {headline} · <span className="font-bold">{euro(amountCents)}</span>
        </p>
      </div>

      <div className="flex flex-col gap-1 border-t border-border pt-3">
        <div className="flex justify-between gap-3">
          <span className="shrink-0 text-muted">Causale</span>
          <span className="text-right font-semibold text-foreground">{causale}</span>
        </div>
      </div>
      <p className="border-t border-border pt-3 text-muted">
        IBAN, intestatario e QR per il bonifico sono nell&apos;email che ti
        abbiamo mandato. Se non la trovi, scrivi al coach.
      </p>
    </Card>
  );
}
