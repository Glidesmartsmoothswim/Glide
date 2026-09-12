// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { RevenueChart, type RevPoint } from "@/components/business/revenue-chart";
import { euro } from "@/lib/workout";
import {
  derivePaymentGate,
  hasFullAccess,
  paymentGraceDays,
} from "@/lib/payment/status";
import { seasonWindow } from "@/lib/payment/pricing";
import { mrrOf, monthlyEquivalent, type MrrProfile } from "@/lib/payment/mrr";

export const metadata = { title: "Business" };

// Soglia regime forfettario (Italia).
const FORFETTARIO_CENTS = 85_000_00;

type TxType = "subscription" | "birra" | "package" | "lesson";

type Tx = {
  id: string;
  type: TxType;
  amount_cents: number;
  status: string;
  description: string | null;
  created_at: string;
};

/**
 * Il profilo come lo legge questa pagina: i campi contabili che servono
 * all'MRR (`MrrProfile`) più lo stato che serve al gate ADR-016. Tenuti
 * distinti perché il calcolo dell'MRR non deve sapere nulla del gate.
 */
type ActiveProfile = MrrProfile & { payment_status: string | null };

/** Come si chiama ogni voce nell'elenco ricavi (migration_058: 4 tipi). */
const TX_LABEL: Record<TxType, string> = {
  subscription: "Abbonamento",
  lesson: "Lezione singola",
  package: "Pacchetto lezioni",
  birra: "🍺 Birra",
};

export default async function BusinessPage() {
  const supabase = await createClient();
  const season = seasonWindow();

  const { data: txData } = await supabase
    .from("transactions")
    .select("id, type, amount_cents, status, description, created_at")
    .order("created_at", { ascending: false });
  const tx = (txData ?? []) as Tx[];
  const ok = tx.filter((t) => t.status === "succeeded");

  // ADR-014: Stripe rimosso, `subscriptions` non è più scritta da nulla —
  // "abbonati attivi"/MRR si leggono da profiles.tier (gate ad accesso),
  // non più da lì.
  const { data: activeProfiles } = await supabase
    .from("profiles")
    .select("tier, payment_status, payment_amount_cents, paid_at, tier_expires_at")
    .eq("role", "swimmer")
    .neq("tier", "free");
  const graceDays = await paymentGraceDays(supabase);
  // ADR-016: "attivo" = il gate eroga (paid/grace). `due` esce dal conteggio
  // insieme a `overdue` — un piano richiesto e mai incassato non è un
  // abbonato attivo e non deve gonfiare l'MRR.
  const active = ((activeProfiles ?? []) as ActiveProfile[]).filter((p) =>
    hasFullAccess(
      derivePaymentGate(
        {
          tier: p.tier,
          payment_status: p.payment_status,
          paid_at: p.paid_at,
          tier_expires_at: p.tier_expires_at,
        },
        graceDays,
      ),
    ),
  );
  // 12/09/2026 — l'MRR non somma più un prezzo di listino per tier (79€ per
  // ogni 1:1, che non è un prezzo del prezzario in vigore): lo ricava
  // dall'incasso reale diviso i mesi che copre. Un Pacchetto Stagionale
  // Elite da 646€ vale 64,60€/mese, non 79€. Vedi lib/payment/mrr.ts.
  const mrr = mrrOf(active);

  // Quello che è stato venduto ma non ancora incassato: è la voce che
  // mancava per riconciliare "venduto" con "incassato" senza andare a
  // guardare tre tabelle a mano.
  const [{ data: duePlans }, { data: dueBookings }, { data: duePackages }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("payment_amount_cents")
        .eq("role", "swimmer")
        .eq("payment_status", "pending_payment"),
      supabase
        .from("bookings")
        .select("amount_cents")
        .eq("payment_status", "da_incassare"),
      supabase
        .from("package_purchases")
        .select("amount_cents")
        .eq("status", "paid")
        .is("paid_at", null),
    ]);
  const sumCents = (rows: { amount_cents?: number | null; payment_amount_cents?: number | null }[] | null) =>
    (rows ?? []).reduce(
      (s, r) => s + (r.amount_cents ?? r.payment_amount_cents ?? 0),
      0,
    );
  const outstanding =
    sumCents(duePlans) + sumCents(dueBookings) + sumCents(duePackages);
  const outstandingCount =
    (duePlans?.length ?? 0) +
    (dueBookings?.length ?? 0) +
    (duePackages?.length ?? 0);

  const { data: rev } = await supabase
    .from("v_monthly_revenue")
    .select("month, revenue_eur");
  const chart: RevPoint[] = (rev ?? []).map(
    (r: { month: string; revenue_eur: number }) => ({
      month: new Date(r.month).toLocaleDateString("it-IT", { month: "short" }),
      revenue: Number(r.revenue_eur),
    }),
  );

  const year = new Date().getFullYear();
  const ytd = ok
    .filter((t) => new Date(t.created_at).getFullYear() === year)
    .reduce((s, t) => s + t.amount_cents, 0);
  // Stagione contabile (1 sett → 31 ago): è la finestra con cui si ragiona
  // sul venduto, mentre la soglia forfettario resta per anno solare.
  const seasonTotal = ok
    .filter((t) => {
      const d = new Date(t.created_at);
      return d >= season.start && d <= season.end;
    })
    .reduce((s, t) => s + t.amount_cents, 0);
  const totalAll = ok.reduce((s, t) => s + t.amount_cents, 0);
  const birre = ok.filter((t) => t.type === "birra");
  const pct = Math.min(100, Math.round((ytd / FORFETTARIO_CENTS) * 100));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blu to-navy text-white">
          <BarChart3 size={20} />
        </span>
        <div>
          <h1 className="font-display text-2xl text-foreground">Business</h1>
          <p className="text-sm text-muted">Ricavi, abbonamenti e soglia fiscale.</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label={`Incassato stagione ${season.label}`} value={euro(seasonTotal / 100)} />
        <Kpi label="MRR" value={euro(mrr.cents / 100)} />
        <Kpi label="Abbonati attivi" value={`${active.length}`} />
        <Kpi
          label="Da incassare"
          value={euro(outstanding / 100)}
          hint={
            outstandingCount === 0
              ? "tutto incassato"
              : `${outstandingCount} ${outstandingCount === 1 ? "voce" : "voci"} in attesa`
          }
        />
      </div>

      <p className="-mt-2 text-sm text-muted">
        MRR = somma dei mensili-equivalenti degli abbonati attivi: importo
        realmente incassato diviso i mesi che copre, così un pacchetto
        stagionale prepagato pesa per il suo mese e non per un intero canone.
        {mrr.gifted > 0 && (
          <>
            {" "}
            {mrr.gifted === 1
              ? "1 abbonamento omaggio è escluso"
              : `${mrr.gifted} abbonamenti omaggio sono esclusi`}{" "}
            dall&apos;MRR: {mrr.gifted === 1 ? "conta" : "contano"} fra gli
            attivi, ma non {mrr.gifted === 1 ? "genera" : "generano"} ricavo.
          </>
        )}
        {mrr.estimated > 0 && (
          <>
            {" "}
            ⚠️ {mrr.estimated}{" "}
            {mrr.estimated === 1
              ? "abbonato non ha importo o date d'incasso a sistema: il suo contributo è"
              : "abbonati non hanno importo o date d'incasso a sistema: il loro contributo è"}{" "}
            preso dal listino, quindi approssimato.
          </>
        )}
      </p>

      <Card>
        <h2 className="mb-2 font-display text-lg text-foreground">
          Ricavi mensili
        </h2>
        <RevenueChart data={chart} />
      </Card>

      <Card className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg text-foreground">
            Soglia forfettario {year}
          </h2>
          <span className="text-sm text-muted">
            {euro(ytd / 100)} / {euro(FORFETTARIO_CENTS / 100)}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blu to-turchese"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted">
          {pct}% della soglia, per anno solare {year} (la stagione sportiva
          non conta qui: il forfettario guarda il 1 gennaio–31 dicembre).
          ⚠️ Indicatore gestionale, <b>non è consulenza fiscale</b>: verifica
          sempre con il tuo commercialista.
        </p>
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">
          Abbonati attivi e mensile-equivalente
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted">Nessun abbonamento attivo.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {active.map((p, i) => {
              const m = monthlyEquivalent(p);
              return (
                <li
                  key={`${p.tier}-${p.paid_at ?? i}`}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {TIER_ACCESS_LABEL[p.tier] ?? p.tier}
                    </p>
                    <p className="text-xs text-muted">
                      {p.payment_amount_cents === 0
                        ? "omaggio — fuori dall'MRR"
                        : `${euro((p.payment_amount_cents ?? 0) / 100)} incassati${
                            m.months ? ` su ${m.months} mesi` : ""
                          }${m.estimated ? " · stima da listino" : ""}`}
                    </p>
                  </div>
                  <span className="font-semibold text-foreground">
                    {euro(m.cents / 100)}
                    <span className="text-xs font-normal text-muted">/mese</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-muted">
          Totale MRR {euro(mrr.cents / 100)} da {mrr.paying}{" "}
          {mrr.paying === 1 ? "abbonato pagante" : "abbonati paganti"}.
        </p>
      </Card>

      <Card>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg text-foreground">Transazioni</h2>
          <span className="text-sm text-muted">
            {euro(totalAll / 100)} in tutto · {birre.length}{" "}
            {birre.length === 1 ? "birra" : "birre"} 🍺
          </span>
        </div>
        {ok.length === 0 ? (
          <p className="text-sm text-muted">Ancora nessuna transazione.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {ok.slice(0, 20).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {TX_LABEL[t.type] ?? t.type}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(t.created_at).toLocaleDateString("it-IT")}
                    {t.description ? ` · ${t.description}` : ""}
                  </p>
                </div>
                <span className="font-semibold text-foreground">
                  {euro(t.amount_cents / 100)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** `profiles.tier` è il piano di ACCESSO, non la voce di listino. */
const TIER_ACCESS_LABEL: Record<string, string> = {
  open: "Open",
  open_plus: "Open+",
  one_to_one: "1:1 Elite",
};

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="font-display text-2xl text-foreground">{value}</span>
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </Card>
  );
}
