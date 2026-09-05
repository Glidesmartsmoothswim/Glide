import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { PricingCard, type Feature } from "@/components/pricing/pricing-card";
import { CheckoutConsent } from "@/components/pricing/checkout-consent";
import { TIER_LABEL } from "@/lib/access";
import { daysExpired } from "@/lib/payment/status";
import { TIER_PRICE_CENTS, type SubTier } from "@/lib/payment/pricing";
import {
  PaymentRequestCard,
  BankTransferCard,
} from "@/components/payment/payment-request-card";
import { fullName } from "@/lib/types";
import { startActivation, requestLessonPackage } from "./actions";
import {
  activePackages,
  pendingPurchase,
  packageTotalCents,
  packagePerLessonCents,
} from "@/lib/payment/packages";
import { EliteQuestionnaire } from "./elite-questionnaire";
import { ELITE_ENTRY_PRICE_CENTS } from "@/lib/payment/elite-pricing";

export const metadata = { title: "Abbonamenti" };

// Colori piano (badge circolare + CTA), dai token brand.
const C = {
  open: "var(--blu)",
  openPlus: "var(--turchese)",
  monthly: "var(--navy)",
  season: "var(--ink)",
};

// Formattazione IT (virgola decimale) — con .toFixed+replace un prezzo come
// 9,90€ finiva "€ 9.90" (punto, non virgola). toLocaleString con fraction
// digits condizionali mantiene "€ 10" per i round e "€ 9,90" per gli altri.
const euro = (cents: number) =>
  `€ ${(cents / 100).toLocaleString("it-IT", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

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
  { label: "Allenamento personalizzato sulle tue esigenze ed obiettivi", included: true },
  // Le call sono fuori listino (Alessio, 05/09/2026): promettere "o remoto"
  // sarebbe una promessa non mantenibile, i servizi call_* sono disattivati.
  { label: "1 lezione/mese inclusa in vasca", included: true },
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


/**
 * Task 4 — l'errore mostrato è ricostruito da SQLSTATE + nome colonna, mai
 * dal testo che arriva in query string: così l'utente vede la causa reale
 * ("valore non ammesso: payment_method") senza che un link costruito ad arte
 * possa far comparire una frase qualsiasi dentro la pagina. Il messaggio
 * integrale del database resta nei log del server.
 */
function activationErrorText(code: string, col?: string): string {
  // Solo un nome di colonna plausibile, altrimenti si ignora.
  const column = col && /^[a-z][a-z0-9_]{0,39}$/.test(col) ? col : null;
  if (code === "23514")
    return column
      ? `Il database non ammette il valore scritto in "${column}". La richiesta non è stata registrata: scrivi al coach.`
      : "Il database ha rifiutato un valore non ammesso. La richiesta non è stata registrata: scrivi al coach.";
  if (code === "42501")
    return "Il database ha rifiutato la scrittura per permessi insufficienti. La richiesta non è stata registrata: scrivi al coach.";
  return "Non è stato possibile inviare la richiesta. Riprova o scrivi al coach.";
}

/** Esito della richiesta pacchetto, ricostruito da un codice — mai da testo
 *  libero in query string (stesso motivo di activationErrorText). */
function packageErrorText(code: string): string {
  if (code === "pending")
    return "Hai già una richiesta di pacchetto in attesa di pagamento: completa quella prima di farne un'altra.";
  if (code === "unavailable")
    return "Questo pacchetto non è più disponibile.";
  return "Non è stato possibile registrare la richiesta. Riprova o scrivi al coach.";
}

export default async function Abbonamenti({
  searchParams,
}: {
  searchParams: Promise<{
    requested?: string;
    err?: string;
    col?: string;
    consent?: string;
    pkg?: string;
    pkgerr?: string;
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
        .select("payment_status, requested_tier, requested_tier_detail, payment_amount_cents")
        .eq("id", profile.id)
        .maybeSingle()
    : { data: null };
  const pending = pay?.payment_status === "pending_payment";
  // ADR-016 (pacchetti): listino e richiesta in corso del nuotatore.
  const [packages, pkgPending] = profile
    ? await Promise.all([
        activePackages(supabase),
        pendingPurchase(supabase, profile.id),
      ])
    : [[], null];
  // ADR-016: gate già calcolato da getCurrentProfile, non ricalcolato qui.
  const gate = profile?.payment_gate ?? "not_applicable";

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
        <Card className="text-[#DC2626]">{activationErrorText(sp.err, sp.col)}</Card>
      )}
      {sp.pkg && (
        <Card className="text-blu">
          Richiesta di acquisto registrata: qui sotto trovi IBAN, causale e QR
          per il bonifico. Appena il coach registra l&apos;incasso ricevi i
          token.
        </Card>
      )}
      {sp.pkgerr && (
        <Card className="text-[#DC2626]">{packageErrorText(sp.pkgerr)}</Card>
      )}
      {sp.consent && (
        <Card className="text-muted">
          Per procedere devi prima spuntare la casella sulla rinuncia al
          recesso: il servizio parte subito quando il coach conferma
          l&apos;incasso, quindi la legge chiede il tuo consenso esplicito ora.
        </Card>
      )}
      {/* PROMPT_CODE_PAGAMENTI TASK 2/3/4 (01/09/2026) — questa È la
          schermata "richiedi attivazione": stesso blocco IBAN/QR/importo
          del profilo, un solo componente condiviso. */}
      {pending && !sp.requested && profile && (
        <PaymentRequestCard
          requestedTier={pay!.requested_tier as SubTier}
          requestedTierDetail={pay!.requested_tier_detail}
          amountCents={pay!.payment_amount_cents ?? 0}
          fullName={fullName(profile)}
          profileId={profile.id}
        />
      )}
      {/* ADR-016 — `due` senza richiesta in corso: il piano risulta attivo ma
          nessun pagamento è registrato. Prima questa schermata non esisteva e
          il nuotatore restava bloccato senza sapere perché né cosa fare. */}
      {gate === "due" && !pending && (
        <Card className="text-[#DC2626]">
          Il tuo piano <b>{TIER_LABEL[tier]}</b> risulta attivo ma non abbiamo
          un pagamento registrato, quindi per ora l&apos;accesso è ridotto alle
          funzioni Base. Se hai già pagato, scrivi al coach: gli basta
          registrare l&apos;incasso e riparte tutto subito.
        </Card>
      )}
      {gate === "grace" && (
        <Card className="text-muted">
          Il tuo piano è scaduto da {daysExpired(profile?.tier_expires_at)}{" "}
          {daysExpired(profile?.tier_expires_at) === 1 ? "giorno" : "giorni"}:
          l&apos;accesso resta invariato, ma rinnova a breve.
        </Card>
      )}
      {gate === "overdue" && (
        <Card className="text-[#DC2626]">
          Il tuo piano è scaduto da {daysExpired(profile?.tier_expires_at)}{" "}
          giorni: niente nuovo programma finché non rinnovi. Storico e
          readiness restano visibili.
        </Card>
      )}

      {/* Base gratuito (ADR-015) — fascia semplice, non una carta di vendita.
          Prenota senza abbonarti: nessun pacchetto token in vendita qui. */}
      <div className="rounded-xl border border-border bg-background p-3 text-sm text-muted">
        <span className="font-bold text-foreground">Base — € 0</span> —
        Registrati gratis: prenota lezioni 1:1 ed eventi dall&apos;Agenda,
        pagamento diretto col coach per ogni prenotazione (€35 lezione
        singola, €100 videoanalisi). Nessuna programmazione né Canale Open
        inclusi.
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
            period="al mese · prezzo di lancio, stagione in corso"
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
            period="al mese · prezzo di lancio, stagione in corso"
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

      {/* Percorso 1:1 — TASK 7 (Sprint C): lo "Stagionale" a prezzo fisso
          (690€, set-giu) è stato tolto dal listino. Chi vuole prepagare
          l'intera stagione invece che mese per mese lo fa nello stesso
          questionario Elite, con lo sconto 15% (doc v3, era 10%) calcolato
          sulla combo canone+credito che ha configurato (EliteQuestionnaire). */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">Percorso 1:1</h2>
        <div className="grid grid-cols-1">
          <PricingCard
            name="Elite"
            color={C.monthly}
            price={`a partire da ${euro(ELITE_ENTRY_PRICE_CENTS)}`}
            period="al mese · prezzo di lancio, stagione in corso"
            tagline="Canone allenamenti + check-in col coach, calcolato su misura"
            features={ONE_TO_ONE}
            cta={pending ? <CtaButton label="Richiesta inviata" color={C.monthly} disabled /> : <EliteQuestionnaire color={C.monthly} />}
          />
        </div>
        <p className="text-sm text-muted">
          1:1 Elite: il prezzo dipende da quanti allenamenti scritti a
          settimana e quanto spesso vuoi un check-in col coach (in vasca o in
          call) — lo calcoli tu prima di richiedere l&apos;attivazione. Puoi
          pagare mese per mese o l&apos;intera stagione in un&apos;unica
          soluzione (-15%). Videoanalisi resta un prodotto a parte (€100).
        </p>
        {/* TASK 4 (doc v5, precisata su richiesta esplicita): dicitura
            "prezzo di lancio" discreta, non invadente — già sui badge period
            delle 3 card sopra; qui una riga unica per tutta la sezione,
            coerente con lo stile del resto della pagina (stessa classe
            text-sm text-muted usata ovunque). Specifica "stagione in corso"
            invece del generico "primo anno". */}
        <p className="text-sm text-muted">
          Open, Open Plus e 1:1 Elite: prezzi di lancio per la stagione in
          corso, non un impegno permanente sulle stagioni successive.
        </p>
      </section>

      {/* ADR-016 — Pacchetti lezioni prepagati. Un pacchetto emette token, e
          un token è credito spendibile: si consegna solo dopo l'incasso. */}
      {packages.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">
            Pacchetti lezioni
          </h2>
          <p className="text-sm text-muted">
            Lezioni in vasca prepagate, da usare quando vuoi: i token dei
            pacchetti <b>non scadono</b>. Li spendi dall&apos;Agenda al momento
            della prenotazione.
          </p>

          {pkgPending && profile ? (
            <BankTransferCard
              title={`Pacchetto ${pkgPending.quantity} lezioni`}
              headline="Bonifico per completare l'acquisto"
              amountCents={pkgPending.amount_cents}
              fullName={fullName(profile)}
              profileId={profile.id}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {packages.map((pk) => (
                <Card key={pk.id} className="flex flex-col gap-2">
                  <p className="font-display text-lg text-foreground">
                    {pk.name}
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {euro(packageTotalCents(pk))}
                  </p>
                  <p className="text-sm text-muted">
                    {euro(packagePerLessonCents(pk))} a lezione
                    {pk.stamp_duty_cents > 0 && " · bollo incluso"}
                  </p>
                  <form action={requestLessonPackage} className="mt-auto pt-1">
                    <input type="hidden" name="package_id" value={pk.id} />
                    <CtaButton label="Acquista" color={C.open} />
                  </form>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      <p className="text-sm text-muted">
        Attivazione manuale (ADR-014): niente carta, il coach conferma
        l&apos;incasso a bonifico e il piano parte subito dopo.
      </p>
    </div>
  );
}
