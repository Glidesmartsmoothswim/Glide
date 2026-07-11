import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { clientFeatures } from "@/lib/flags";
import { signOut } from "@/app/login/actions";
import { Card, Pill } from "@/components/ui/card";
import { subscribe } from "./actions";
import {
  SERVICE_LABEL,
  CERT_LABEL,
  fullName,
  type SwimmerRow,
} from "@/lib/types";

export const metadata = { title: "Profilo" };

const PLANS: { tier: "open" | "open_water" | "elite"; name: string; price: string }[] = [
  { tier: "open", name: "Open", price: "€29" },
  { tier: "open_water", name: "Open Water", price: "€79" },
  { tier: "elite", name: "Elite 1:1", price: "€129" },
];

export default async function SwimmerProfilo({
  searchParams,
}: {
  searchParams: Promise<{ sim?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: full } = await supabase
    .from("profiles")
    .select(
      "id, role, first_name, last_name, email, phone, service_type, level, package, status, cert_status, cert_expiry, member_since",
    )
    .eq("id", profile?.id ?? "")
    .single();
  const me = full as SwimmerRow | null;

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("tier, status, current_period_end")
    .eq("swimmer_id", profile?.id ?? "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl text-foreground">
          {me ? fullName(me) : "Profilo"}
        </h1>
        <p className="text-sm text-muted">{me?.email}</p>
      </header>

      {me && (
        <Card className="flex flex-col gap-2 text-sm">
          <Row label="Servizio" value={SERVICE_LABEL[me.service_type]} />
          {me.level && <Row label="Livello" value={me.level} />}
          {me.package && <Row label="Pacchetto" value={me.package} />}
          <Row label="Certificato" value={CERT_LABEL[me.cert_status]} />
          <Row
            label="Abbonamento"
            value={sub ? `${sub.tier} · ${sub.status}` : "nessuno"}
          />
        </Card>
      )}

      {sp.ok && (
        <Card className="text-teal">Pagamento completato. Grazie!</Card>
      )}
      {sp.sim && (
        <Card className="text-muted">
          Checkout in modalità simulata: per attivare i pagamenti reali servono
          le chiavi Stripe (Price ID) in <code>.env.local</code>.
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg text-foreground">Abbonamenti</h2>
          {!clientFeatures.stripe && <Pill tone="warn">simulato</Pill>}
        </div>
        <div className="grid gap-3">
          {PLANS.map((p) => (
            <form
              key={p.tier}
              action={subscribe}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4"
            >
              <input type="hidden" name="tier" value={p.tier} />
              <div>
                <p className="font-semibold text-foreground">{p.name}</p>
                <p className="text-sm text-muted">{p.price} / mese</p>
              </div>
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-2.5 text-sm font-semibold text-white"
              >
                Attiva
              </button>
            </form>
          ))}
        </div>
      </section>

      <form action={signOut}>
        <button
          type="submit"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <LogOut size={16} /> Esci
        </button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
