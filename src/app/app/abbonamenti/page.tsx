import { getCurrentProfile } from "@/lib/auth";
import { clientFeatures } from "@/lib/flags";
import { Card, Pill } from "@/components/ui/card";
import { PricingCard, type Feature } from "@/components/pricing/pricing-card";
import { CheckoutConsent } from "@/components/pricing/checkout-consent";
import { TIER_LABEL } from "@/lib/access";
import { startSubscription, startSeason } from "./actions";

export const metadata = { title: "Abbonamenti" };

// Colori piano (badge circolare + CTA), dai token brand.
const C = {
  open: "var(--blu)",
  openPlus: "var(--turchese)",
  monthly: "var(--navy)",
  season: "var(--ink)",
};

// Righe feature ALLINEATE per far saltare all'occhio le differenze (13.5).
const OPEN: Feature[] = [
  { label: "3 allenamenti a settimana", included: true },
  { label: "Ordine libero", included: true },
  { label: "Archivio personale svolti", included: true },
  { label: "Libreria Open", included: true },
  { label: "Archivio storico completo", included: false },
  { label: "Filtri e ricerca", included: false },
];
const OPEN_PLUS: Feature[] = OPEN.map((f) => ({ ...f, included: true }));
const ONE_TO_ONE: Feature[] = [
  { label: "Programmazione dedicata", included: true },
  { label: "1 lezione/mese inclusa (vasca o remoto)", included: true },
  { label: "Video gara: caricamento e analisi del coach inclusi", included: true },
  { label: "Contatto diretto col coach", included: true },
];

function CtaButton({
  label,
  color,
  disabled,
}: {
  label: string;
  color: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      style={disabled ? undefined : { background: color }}
      className="w-full rounded-lg py-2.5 text-sm font-bold text-white disabled:bg-background disabled:text-muted"
    >
      {label}
    </button>
  );
}

export default async function Abbonamenti({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    canceled?: string;
    sim?: string;
    consent?: string;
  }>;
}) {
  const sp = await searchParams;
  const profile = await getCurrentProfile();
  const tier = profile?.tier ?? "free";
  const cur = (t: string) => tier === t;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl text-foreground">Scegli il tuo piano</h1>
        <p className="flex items-center gap-2 text-sm text-muted">
          Piano attuale: <span className="font-bold">{TIER_LABEL[tier]}</span>
          {!clientFeatures.stripe && <Pill tone="warn">simulato</Pill>}
        </p>
      </header>

      {sp.ok && <Card className="text-teal">Pagamento completato. Grazie!</Card>}
      {sp.consent && (
        <Card className="text-muted">
          Per procedere devi prima spuntare la casella sulla rinuncia al
          recesso: il servizio parte subito, quindi la legge chiede il tuo
          consenso esplicito prima del pagamento.
        </Card>
      )}
      {sp.sim && (
        <Card className="text-muted">
          Checkout in modalità simulata: per attivare i pagamenti reali servono i
          Price ID Stripe in <code>.env.local</code>.
        </Card>
      )}
      <Card className="text-muted">
        Versione di prova: i prezzi non sono ancora attivi.
      </Card>

      {/* FREE — fascia semplice, non una carta di vendita */}
      <div className="rounded-xl border border-border bg-background p-3 text-sm text-muted">
        <span className="font-bold text-foreground">Free</span> — Registrati
        gratis: Libreria e prenotazione eventi singoli.
      </div>

      {/* Canale Open */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">Canale Open</h2>
        <div className="grid grid-cols-2 gap-3">
          <PricingCard
            name="Open"
            color={C.open}
            badge="Consigliato"
            features={OPEN}
            cta={
              cur("open") ? (
                <CtaButton label="Piano attuale" color={C.open} disabled />
              ) : (
                <form action={startSubscription}>
                  <input type="hidden" name="tier" value="open" />
                  <CheckoutConsent label="Attiva Open" color={C.open} />
                </form>
              )
            }
          />
          <PricingCard
            name="Open+"
            color={C.openPlus}
            features={OPEN_PLUS}
            cta={
              cur("open_plus") ? (
                <CtaButton label="Piano attuale" color={C.openPlus} disabled />
              ) : (
                <form action={startSubscription}>
                  <input type="hidden" name="tier" value="open_plus" />
                  <CheckoutConsent label="Attiva Open+" color={C.openPlus} />
                </form>
              )
            }
          />
        </div>
      </section>

      {/* Percorso 1:1 */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">Percorso 1:1</h2>
        <div className="grid grid-cols-2 gap-3">
          <PricingCard
            name="Mensile"
            color={C.monthly}
            features={ONE_TO_ONE}
            cta={
              <form action={startSubscription}>
                <input type="hidden" name="tier" value="one_to_one_monthly" />
                <CheckoutConsent label="Attiva mensile" color={C.monthly} />
              </form>
            }
          />
          <PricingCard
            name="Stagionale"
            color={C.season}
            tagline="settembre – giugno"
            features={ONE_TO_ONE}
            cta={
              <form action={startSeason}>
                <CheckoutConsent label="Attiva stagionale" color={C.season} />
              </form>
            }
          />
        </div>
      </section>

      <p className="text-sm text-muted">
        Puoi usare un codice promozionale al momento del pagamento.
      </p>
    </div>
  );
}
