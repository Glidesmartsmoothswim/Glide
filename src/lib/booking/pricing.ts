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

/** Prezzo cash effettivo per il servizio, dato il profilo dello swimmer. */
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
