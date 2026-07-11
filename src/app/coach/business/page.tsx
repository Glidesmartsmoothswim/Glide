import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { RevenueChart, type RevPoint } from "@/components/business/revenue-chart";
import { euro } from "@/lib/workout";

export const metadata = { title: "Business" };

// Soglia regime forfettario (Italia).
const FORFETTARIO_CENTS = 85_000_00;

type Tx = {
  id: string;
  type: "subscription" | "birra";
  amount_cents: number;
  status: string;
  description: string | null;
  created_at: string;
};

export default async function BusinessPage() {
  const supabase = await createClient();

  const { data: txData } = await supabase
    .from("transactions")
    .select("id, type, amount_cents, status, description, created_at")
    .order("created_at", { ascending: false });
  const tx = (txData ?? []) as Tx[];
  const ok = tx.filter((t) => t.status === "succeeded");

  const { data: subs } = await supabase
    .from("subscriptions")
    .select("price_cents, status")
    .eq("status", "active");
  const mrr = (subs ?? []).reduce((s, r) => s + (r.price_cents ?? 0), 0);

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
        <Kpi label="Ricavi totali" value={euro(totalAll / 100)} />
        <Kpi label="MRR" value={euro(mrr / 100)} />
        <Kpi label="Birre 🍺" value={`${birre.length}`} />
        <Kpi label="Abbonati attivi" value={`${subs?.length ?? 0}`} />
      </div>

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
          {pct}% della soglia. ⚠️ Indicatore gestionale, <b>non è consulenza
          fiscale</b>: verifica sempre con il tuo commercialista.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-display text-lg text-foreground">Transazioni</h2>
        {ok.length === 0 ? (
          <p className="text-sm text-muted">Ancora nessuna transazione.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {ok.slice(0, 20).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t.type === "birra" ? "🍺 Birra" : "Abbonamento"}
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

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="font-display text-2xl text-foreground">{value}</span>
    </Card>
  );
}
