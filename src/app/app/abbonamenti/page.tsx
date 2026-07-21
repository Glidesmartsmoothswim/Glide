import { getCurrentProfile } from "@/lib/auth";
import { clientFeatures } from "@/lib/flags";
import { Card, Pill } from "@/components/ui/card";
import { PricingCard } from "@/components/pricing/pricing-card";
import { TIER_LABEL } from "@/lib/access";
import { startSubscription, startSeason } from "./actions";

export const metadata = { title: "Abbonamenti" };

const OPEN_INCLUDES = [
  "3 allenamenti a settimana",
  "Ordine libero",
  "Archivio personale degli svolti",
  "Libreria Open",
];
const OPEN_PLUS_INCLUDES = [
  "Tutto quello di Open",
  "Archivio storico completo",
  "Filtri e ricerca",
];
const ONE_TO_ONE_INCLUDES = [
  "Programmazione dedicata",
  "1 lezione al mese inclusa (presenza o remoto)",
  "Videoanalisi inclusa",
  "Contatto diretto col coach",
];

function CtaButton({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="rounded-xl bg-gradient-to-br from-blu to-navy py-2.5 text-sm font-semibold text-white disabled:opacity-50"
    >
      {label}
    </button>
  );
}

export default async function Abbonamenti({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; canceled?: string; sim?: string }>;
}) {
  const sp = await searchParams;
  const profile = await getCurrentProfile();
  const tier = profile?.tier ?? "free";

  const cur = (t: string) => tier === t;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl text-foreground">Abbonamenti</h1>
        <p className="flex items-center gap-2 text-sm text-muted">
          Piano attuale: <span className="font-semibold">{TIER_LABEL[tier]}</span>
          {!clientFeatures.stripe && <Pill tone="warn">simulato</Pill>}
        </p>
      </header>

      {sp.ok && <Card className="text-teal">Pagamento completato. Grazie!</Card>}
      {sp.sim && (
        <Card className="text-muted">
          Checkout in modalità simulata: per attivare i pagamenti reali servono i
          Price ID Stripe in <code>.env.local</code>.
        </Card>
      )}

      {/* FREE — fascia semplice, non una carta di vendita */}
      <div className="rounded-xl border border-border bg-background p-3 text-sm text-muted">
        <span className="font-semibold text-foreground">Free</span> — Registrati
        gratis: Libreria e prenotazione eventi singoli.
      </div>

      {/* Canale Open */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">Canale Open</h2>
        <div className="grid grid-cols-2 gap-3">
          <PricingCard
            name="Open"
            price="12,90 €"
            period="mese"
            badge="Consigliato"
            tagline="Meno di un caffè ad allenamento"
            includes={OPEN_INCLUDES}
            highlighted
            cta={
              <form action={startSubscription}>
                <input type="hidden" name="tier" value="open" />
                <CtaButton
                  label={cur("open") ? "Piano attuale" : "Attiva Open"}
                  disabled={cur("open")}
                />
              </form>
            }
          />
          <PricingCard
            name="Open+"
            price="19,90 €"
            period="mese"
            includes={OPEN_PLUS_INCLUDES}
            cta={
              <form action={startSubscription}>
                <input type="hidden" name="tier" value="open_plus" />
                <CtaButton
                  label={cur("open_plus") ? "Piano attuale" : "Attiva Open+"}
                  disabled={cur("open_plus")}
                />
              </form>
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
            price="79 €"
            period="mese"
            includes={ONE_TO_ONE_INCLUDES}
            cta={
              <form action={startSubscription}>
                <input type="hidden" name="tier" value="one_to_one_monthly" />
                <CtaButton label="Attiva mensile" />
              </form>
            }
          />
          <PricingCard
            name="Stagionale"
            price="690 €"
            tagline="settembre – giugno"
            saving="Paghi 690 invece di 790"
            includes={ONE_TO_ONE_INCLUDES}
            cta={
              <form action={startSeason}>
                <CtaButton label="Attiva stagionale" />
              </form>
            }
          />
        </div>
      </section>

      <p className="text-xs text-muted">
        Puoi usare un codice promozionale al momento del pagamento.
      </p>
    </div>
  );
}
