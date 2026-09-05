/**
 * Sprint C.3 (ADR-015 estesa) — prezzo effettivo "a saldo diretto" (cash) per
 * un booking, tenendo conto delle due leve per-nuotatore introdotte in
 * questo sprint:
 *  - group_lesson_affiliate: sconto fisso sulla lezione di gruppo (10€ → 5€).
 *  - extra_lesson_price_override_cents: sconto storico/discrezionale sulla
 *    lezione privata "fuori piano" (sostituisce il prezzo di listino quando
 *    valorizzato).
 * Il credito/token non passano da qui: amount_cents esiste solo quando si
 * salda cash (vedi booking/create/route.ts).
 */

export type PricingProfile = {
  group_lesson_affiliate?: boolean | null;
  extra_lesson_price_override_cents?: number | null;
};

export type PricingService = {
  code: string;
  price_cents: number;
};

export const isGroupLessonCode = (code: string): boolean =>
  code.startsWith("group_");

/** Prezzo cash "lezione di gruppo" scontato per gli affiliati. */
export const GROUP_LESSON_AFFILIATE_CENTS = 500;

/**
 * Prezzo cash effettivo per il servizio, dato il profilo dello swimmer.
 *
 * ⚠️ ADR-016 (pacchetti) e PROMPT_CODE_VENDITE Step 1 affermano che
 * `group_lesson_affiliate` "resta non cablato" e che non va letto. È
 * SBAGLIATO: è cablato qui da Sprint C.3 e funziona — la lezione di gruppo
 * passa da 10€ a 5€ per gli affiliati. Confermato voluto da Alessio
 * (05/09/2026): NON rimuoverlo sulla scorta di quei documenti, cambierebbe
 * quanto pagano clienti reali.
 *
 * Questa funzione è anche il `resolveBookingPrice` che lo Step 1 chiede di
 * creare: esiste già ed è collegata a /api/booking/create. Non farne una
 * seconda copia.
 */
export function effectiveCashPriceCents(
  service: PricingService,
  profile: PricingProfile,
): number {
  if (isGroupLessonCode(service.code))
    return profile.group_lesson_affiliate
      ? GROUP_LESSON_AFFILIATE_CENTS
      : service.price_cents;
  return profile.extra_lesson_price_override_cents ?? service.price_cents;
}
