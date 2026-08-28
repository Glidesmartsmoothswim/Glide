import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { PricingCard, type Feature } from "@/components/pricing/pricing-card";
import { CheckoutConsent } from "@/components/pricing/checkout-consent";
import { TIER_LABEL } from "@/lib/access";
import { gateState, daysOverdue } from "@/lib/payment/gate";
import {
  TIER_PRICE_CENTS,
  TIER_LABEL as SUB_TIER_LABEL,
  type SubTier,
} from "@/lib/payment/pricing";
import { startActivation } from "./actions";

export const metadata = { title: "Abbonamenti" };

// Colori piano (badge circolare + CTA), dai token brand.
const C = {
  open: "var(--blu)",
  openPlus: "var(--turchese)",
  monthly: "var(--navy)",
  season: "var(--ink)",
};

const euro = (cents: number) => `€ ${(cents / 100).toFixed(2).replace(".00", "")}`;

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
    requested?: string;
    err?: string;
    consent?: string;
  }>;
}) {
  const sp = await searchParams;
  const profile = await getCurrentProfile();
  const tier = profile?.tier ?? "free";
  const cur = (t: string) => tier === t;

  const supabase = await createClient();
  const { data: pay } = profile
    ? await supabase
        .from("profiles")
        .select("payment_status, requested_tier, payment_amount_cents")
        .eq("id", profile.id)
        .maybeSingle()
    : { data: null };
  const pending = pay?.payment_status === "pending_payment";
  const gate = gateState(profile?.tier_expires_at ?? null);

  const colorFor = (t: SubTier) =>
    t === "open"
      ? C.open
      : t === "open_plus"
        ? C.openPlus
        : t === "one_to_one_monthly"
          ? C.monthly
          : C.season;

  const activate = (t: SubTier) => (
    <form action={startActivation}>
      <input type="hidden" name="tier" value={t} />
      {pending ? (
        <CtaButton label="Richiesta inviata" color={colorFor(t)} disabled />
      ) : (
        <CheckoutConsent label="Richiedi attivazione" color={colorFor(t)} />
      )}
    </form>
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl text-foreground">Scegli il tuo piano</h1>
        <p className="flex items-center gap-2 text-sm text-muted">
          Piano attuale: <span className="font-bold">{TIER_LABEL[tier]}</span>
        </p>
      </header>

      {sp.requested && (
        <Card className="text-blu">
          Richiesta inviata: controlla la mail per i dettagli del bonifico. Il
          piano si attiva appena il coach registra l&apos;incasso.
        </Card>
      )}
      {sp.err && (
        <Card className="text-[#DC2626]">
          Non è stato possibile inviare la richiesta. Riprova o scrivi al coach.
        </Card>
      )}
      {sp.consent && (
        <Card className="text-muted">
          Per procedere devi prima spuntare la casella sulla rinuncia al
          recesso: il servizio parte subito quando il coach conferma
          l&apos;incasso, quindi la legge chiede il tuo consenso esplicito ora.
        </Card>
      )}
      {pending && !sp.requested && (
        <Card className="text-blu">
          Richiesta di attivazione {SUB_TIER_LABEL[pay!.requested_tier as SubTier]}{" "}
          in attesa di conferma — il coach la registra dopo l&apos;incasso.
        </Card>
      )}
      {gate === "grace" && (
        <Card className="text-muted">
          Il tuo piano è scaduto da {daysOverdue(profile?.tier_expires_at)}{" "}
          {daysOverdue(profile?.tier_expires_at) === 1 ? "giorno" : "giorni"}:
          l&apos;accesso resta invariato, ma rinnova a breve.
        </Card>
      )}
      {gate === "overdue" && (
        <Card className="text-[#DC2626]">
          Il tuo piano è scaduto da {daysOverdue(profile?.tier_expires_at)}{" "}
          giorni: niente nuovo programma finché non rinnovi. Storico e
          readiness restano visibili.
        </Card>
      )}

      {/* Base gratuito (ADR-015) — fascia semplice, non una carta di vendita.
          Prenota senza abbonarti: nessun pacchetto token in vendita qui. */}
      <div className="rounded-xl border border-border bg-background p-3 text-sm text-muted">
        <span className="font-bold text-foreground">Base — € 0</span> —
        Registrati gratis: prenota lezioni 1:1 ed eventi dall&apos;Agenda,
        pagamento diretto col coach per ogni prenotazione. Nessuna
        programmazione né Canale Open inclusi.
      </div>

      {/* Canale Open */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">Canale Open</h2>
        <div className="grid grid-cols-2 gap-3">
          <PricingCard
            name="Open"
            color={C.open}
            badge="Consigliato"
            price={euro(TIER_PRICE_CENTS.open)}
            period="al mese"
            features={OPEN}
            cta={
              cur("open") ? (
                <CtaButton label="Piano attuale" color={C.open} disabled />
              ) : (
                activate("open")
              )
            }
          />
          <PricingCard
            name="Open+"
            color={C.openPlus}
            price={euro(TIER_PRICE_CENTS.open_plus)}
            period="al mese"
            features={OPEN_PLUS}
            cta={
              cur("open_plus") ? (
                <CtaButton label="Piano attuale" color={C.openPlus} disabled />
              ) : (
                activate("open_plus")
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
            price={euro(TIER_PRICE_CENTS.one_to_one_monthly)}
            period="al mese"
            features={ONE_TO_ONE}
            cta={activate("one_to_one_monthly")}
          />
          <PricingCard
            name="Stagionale"
            color={C.season}
            price={euro(TIER_PRICE_CENTS.one_to_one_season)}
            tagline="settembre – giugno"
            features={ONE_TO_ONE}
            cta={activate("one_to_one_season")}
          />
        </div>
      </section>

      <p className="text-sm text-muted">
        Attivazione manuale (ADR-014): niente carta, il coach conferma
        l&apos;incasso a bonifico e il piano parte subito dopo.
      </p>
    </div>
  );
}
