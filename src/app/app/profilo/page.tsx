import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { clientFeatures } from "@/lib/flags";
import { signOut } from "@/app/login/actions";
import { Card, Pill } from "@/components/ui/card";
import { subscribe } from "./actions";
import { ObjectivesManager } from "./objectives-manager";
import { CertificateUploader } from "./certificate-uploader";
import type { ObjectiveRow } from "@/lib/objectives";
import {
  certLight,
  daysToExpiry,
  CERT_LIGHT_LABEL,
  CERT_LIGHT_DOT,
  type MedicalCertRow,
} from "@/lib/certificates";
import { formatTempo } from "@/lib/profile/tempo";
import { STILE_LABEL, type Stile } from "@/lib/profile/costanti";
import {
  SERVICE_LABEL,
  CERT_LABEL,
  fullName,
  type SwimmerRow,
} from "@/lib/types";

export const metadata = { title: "Profilo" };

// Onda 12.1: piani self-serve = Open e Open+. Il tier 1:1 lo assegna il coach.
// Il prezzo di Open+ lo decide Alessio (STRIPE_PRICE_OPEN_PLUS): finché non è
// fissato mostriamo il piano senza cifra, senza inventarla.
const PLANS: { tier: "open" | "open_plus"; name: string; price?: string; desc: string }[] = [
  { tier: "open", name: "Open", price: "€29", desc: "Settimana Canale Open + archivio dei tuoi svolti" },
  { tier: "open_plus", name: "Open+", desc: "Tutto Open + archivio storico completo" },
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

  const { data: ath } = await supabase
    .from("profiles")
    .select("anno_nascita, categoria, stili_abituali, distanze_abituali")
    .eq("id", profile?.id ?? "")
    .single();

  const { data: objData } = await supabase
    .from("objectives")
    .select("*")
    .eq("swimmer_id", profile?.id ?? "")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  const objectives = (objData ?? []) as ObjectiveRow[];

  const { data: certData } = await supabase
    .from("medical_certificates")
    .select("*")
    .eq("swimmer_id", profile?.id ?? "")
    .order("data_scadenza", { ascending: false })
    .limit(1)
    .maybeSingle();
  const cert = certData as MedicalCertRow | null;
  const light = certLight(cert?.data_scadenza ?? null);
  const certDays = daysToExpiry(cert?.data_scadenza ?? null);

  const { data: pbs } = await supabase
    .from("personal_bests")
    .select("id, distanza_m, stile, vasca, tempo_cc, data_conseguimento")
    .eq("swimmer_id", profile?.id ?? "")
    .order("stile", { ascending: true })
    .order("distanza_m", { ascending: true });

  const hasProfile = Boolean(
    ath?.anno_nascita ||
      (ath?.stili_abituali?.length ?? 0) > 0 ||
      (pbs?.length ?? 0) > 0,
  );

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

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-foreground">Profilo atleta</h2>
          <Link
            href="/app/profilo/crea"
            className="text-sm font-semibold text-blu"
          >
            {hasProfile ? "Modifica" : "Completa"}
          </Link>
        </div>
        {hasProfile ? (
          <Card className="flex flex-col gap-2 text-sm">
            {ath?.categoria && <Row label="Categoria" value={ath.categoria} />}
            {ath?.anno_nascita && (
              <Row label="Anno" value={String(ath.anno_nascita)} />
            )}
            {(ath?.stili_abituali?.length ?? 0) > 0 && (
              <Row
                label="Stili"
                value={ath!.stili_abituali
                  .map((s: string) => STILE_LABEL[s as Stile] ?? s)
                  .join(", ")}
              />
            )}
            {(ath?.distanze_abituali?.length ?? 0) > 0 && (
              <Row
                label="Distanze"
                value={ath!.distanze_abituali
                  .map((d: string) => (d === "Fondo" ? "Fondo" : `${d} m`))
                  .join(", ")}
              />
            )}
            {(pbs?.length ?? 0) > 0 && (
              <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
                <p className="text-muted">Personal best</p>
                {pbs!.map((pb) => (
                  <div key={pb.id} className="flex justify-between">
                    <span className="text-muted">
                      {pb.distanza_m} {pb.stile} · vasca {pb.vasca}
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatTempo(pb.tempo_cc)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
          <Card className="text-sm text-muted">
            Racconta chi sei: categoria, specialità e i tuoi tempi.{" "}
            <Link href="/app/profilo/crea" className="font-semibold text-blu">
              Inizia →
            </Link>
          </Card>
        )}
      </section>

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
        <h2 className="font-display text-lg text-foreground">Certificato medico</h2>
        {cert && (
          <Card className="flex items-center gap-3">
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ background: CERT_LIGHT_DOT[light] }}
            />
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                {CERT_LIGHT_LABEL[light]}
              </p>
              <p className="text-xs text-muted">
                Scadenza {cert.data_scadenza}
              </p>
            </div>
            <Link
              href="/app/profilo/certificato"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-blu"
            >
              Apri
            </Link>
          </Card>
        )}
        {certDays != null && certDays >= 0 && certDays <= 30 && (
          <p className="rounded-xl bg-amber-500/5 p-3 text-sm text-muted">
            Il tuo certificato scade tra {certDays}{" "}
            {certDays === 1 ? "giorno" : "giorni"}: caricane uno aggiornato quando
            puoi.
          </p>
        )}
        <Card>
          <CertificateUploader />
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">I miei obiettivi</h2>
        <p className="text-sm text-muted">
          Le direzioni che condividi con il coach. Aggiungine quanti vuoi.
        </p>
        <ObjectivesManager items={objectives} />
      </section>

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
                <p className="text-sm text-muted">
                  {p.price ? `${p.price} / mese` : p.desc}
                </p>
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
