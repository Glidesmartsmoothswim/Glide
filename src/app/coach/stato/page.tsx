import { Activity } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { serverFeatures } from "@/lib/flags";
import { publicEnv } from "@/lib/env";
import { Card } from "@/components/ui/card";
import { currentMonday } from "@/lib/week";

export const metadata = { title: "Stato sistema" };
export const dynamic = "force-dynamic";

type Tone = "ok" | "warn" | "off";
const DOT: Record<Tone, string> = {
  ok: "#16A34A",
  warn: "#F59E0B",
  off: "#94A3B8",
};

function Row({
  label,
  tone,
  detail,
}: {
  label: string;
  tone: Tone;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: DOT[tone] }}
      />
      <span className="flex-1 text-sm font-semibold text-foreground">
        {label}
      </span>
      <span className="text-sm text-muted">{detail}</span>
    </div>
  );
}

export default async function StatoSistema() {
  await requireRole("coach");
  const supabase = await createClient();
  const f = serverFeatures();

  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL;
  const appUrlOk = !/localhost|127\.0\.0\.1|placeholder/.test(appUrl);
  const cronSet = Boolean(process.env.CRON_SECRET);

  // Conteggi "campo pronto" (RLS: il coach legge).
  const monday = currentMonday();
  const [sw, prog, openWk, lib, svc] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "swimmer"),
    supabase.from("programs").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .eq("kind", "open_channel")
      .eq("week_start", monday),
    supabase.from("library_items").select("id", { count: "exact", head: true }).eq("published", true),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("active", true),
  ]);

  const n = (r: { count: number | null }) => r.count ?? 0;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blu to-navy text-white">
          <Activity size={20} />
        </span>
        <div>
          <h1 className="font-display text-2xl text-foreground">Stato sistema</h1>
          <p className="text-sm text-muted">
            Controllo rapido di configurazione e prontezza per i tester.
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-foreground">Configurazione</h2>
        <Card className="flex flex-col divide-y divide-border">
          <Row
            label="URL app"
            tone={appUrlOk ? "ok" : "warn"}
            detail={appUrl}
          />
          <Row
            label="Database (Supabase)"
            tone={sw.error ? "warn" : "ok"}
            detail={sw.error ? "errore lettura" : "connesso"}
          />
          <Row
            label="Cron protetti (CRON_SECRET)"
            tone={cronSet ? "ok" : "warn"}
            detail={cronSet ? "impostata" : "manca → cron non protetti"}
          />
          <Row
            label="Pagamenti (Stripe)"
            tone={f.stripe ? "ok" : "off"}
            detail={f.stripe ? "attivo" : "simulato"}
          />
          <Row
            label="Webhook Stripe"
            tone={f.stripeWebhook ? "ok" : "off"}
            detail={f.stripeWebhook ? "verificato" : "non configurato"}
          />
          <Row
            label="Email (Resend)"
            tone={f.resend ? "ok" : "off"}
            detail={f.resend ? "attivo" : "simulato (digest solo in-app)"}
          />
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-lg text-foreground">Campo pronto</h2>
        <Card className="flex flex-col divide-y divide-border">
          <Row
            label="Nuotatori"
            tone={n(sw) > 0 ? "ok" : "warn"}
            detail={`${n(sw)}`}
          />
          <Row
            label="Programmi 1:1 attivi"
            tone={n(prog) > 0 ? "ok" : "off"}
            detail={`${n(prog)}`}
          />
          <Row
            label="Canale Open · settimana corrente"
            tone={n(openWk) > 0 ? "ok" : "warn"}
            detail={`${n(openWk)} allenamenti`}
          />
          <Row
            label="Libreria pubblicata"
            tone={n(lib) > 0 ? "ok" : "off"}
            detail={`${n(lib)} contenuti`}
          />
          <Row
            label="Servizi prenotabili"
            tone={n(svc) > 0 ? "ok" : "warn"}
            detail={`${n(svc)}`}
          />
        </Card>
      </section>

      <p className="text-xs text-muted">
        Verde = ok · giallo = da sistemare prima del lancio · grigio = funzione
        opzionale non attiva (ok per la settimana di prova).
      </p>
    </div>
  );
}
