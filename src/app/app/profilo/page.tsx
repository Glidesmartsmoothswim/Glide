import Link from "next/link";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { signOut } from "@/app/login/actions";
import { Card } from "@/components/ui/card";
import { TIER_LABEL as ACCESS_TIER_LABEL } from "@/lib/access";
import { gateState, daysOverdue } from "@/lib/payment/gate";
import type { SubTier } from "@/lib/payment/pricing";
import { bankTransferDetails } from "@/lib/payment/bank";
import { PaymentRequestCard } from "@/components/payment/payment-request-card";
import { ObjectivesManager } from "./objectives-manager";
import { MfaSettings } from "@/components/account/mfa-settings";
import { PbManager, type Pb } from "./pb-manager";
import type { ObjectiveRow } from "@/lib/objectives";
import {
  availableCount,
  isTokenAvailable,
  type LessonTokenRow,
} from "@/lib/tokens";
import { formatTempo } from "@/lib/profile/tempo";
import { STILE_LABEL, type Stile } from "@/lib/profile/costanti";
import {
  SERVICE_LABEL,
  fullName,
  type SwimmerRow,
} from "@/lib/types";

export const metadata = { title: "Profilo" };

export default async function SwimmerProfilo() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  // Onda 14.2: un solo read profili (full+ath erano la stessa riga) e tutte le
  // query indipendenti in parallelo (Promise.all), non a cascata.
  const sid = profile?.id ?? "";
  const [profRes, objRes, tokRes, pbRes, bank] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, role, first_name, last_name, email, phone, service_type, tier, tier_expires_at, requested_tier, requested_tier_detail, payment_status, payment_amount_cents, level, package, status, member_since, anno_nascita, categoria, stili_abituali, distanze_abituali",
      )
      .eq("id", sid)
      .single(),
    supabase
      .from("objectives")
      .select("*")
      .eq("swimmer_id", sid)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("lesson_tokens")
      .select("*")
      .eq("swimmer_id", sid)
      .order("granted_at", { ascending: false })
      .limit(20),
    supabase
      .from("personal_bests")
      .select("id, distanza_m, stile, vasca, tempo_cc, data_conseguimento")
      .eq("swimmer_id", sid)
      .order("stile", { ascending: true })
      .order("distanza_m", { ascending: true }),
    // PROMPT_CODE_PAGAMENTI TASK 2 (01/09/2026): IBAN/intestatario da
    // app_config, secondo punto di verifica indipendente dall'email.
    bankTransferDetails(supabase),
  ]);

  const me = profRes.data as SwimmerRow | null;
  const ath = profRes.data as {
    anno_nascita: number | null;
    categoria: string | null;
    stili_abituali: string[];
    distanze_abituali: string[];
  } | null;
  const pay = profRes.data as {
    tier_expires_at: string | null;
    requested_tier: SubTier | null;
    requested_tier_detail: string | null;
    payment_status: "pending_payment" | "paid" | null;
    payment_amount_cents: number | null;
  } | null;
  const gate = gateState(pay?.tier_expires_at ?? null);
  const objectives = (objRes.data ?? []) as ObjectiveRow[];
  const tokens = (tokRes.data ?? []) as LessonTokenRow[];
  const tokenAvail = availableCount(tokens);
  const pbs = pbRes.data;

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
          <Row label="Piano" value={ACCESS_TIER_LABEL[me.tier]} />
        </Card>
      )}

      {/* PROMPT_CODE_PAGAMENTI TASK 6 (01/09/2026): "tipologia abbonamento"
          solo per 1:1 Elite — allenamenti/sett + cadenza check-in + canale,
          da requested_tier_detail (migration_044, "solo display"). */}
      {me?.tier === "one_to_one" && pay?.requested_tier_detail && (
        <Card className="flex flex-col gap-1 text-sm">
          <p className="t-label text-muted">Tipologia abbonamento</p>
          <p className="text-foreground">{pay.requested_tier_detail}</p>
        </Card>
      )}

      {gate === "grace" && (
        <p className="rounded-xl bg-amber-500/5 p-3 text-sm text-muted">
          Il tuo piano è scaduto da {daysOverdue(pay?.tier_expires_at)}{" "}
          {daysOverdue(pay?.tier_expires_at) === 1 ? "giorno" : "giorni"}:
          l&apos;accesso resta invariato, ma rinnova a breve.
        </p>
      )}
      {gate === "overdue" && (
        <p className="rounded-xl bg-red-500/5 p-3 text-sm text-[#DC2626]">
          Il tuo piano è scaduto da {daysOverdue(pay?.tier_expires_at)} giorni:
          niente nuovo programma finché non rinnovi. Storico e readiness
          restano visibili.
        </p>
      )}
      {/* PROMPT_CODE_PAGAMENTI TASK 2/3/4 (01/09/2026) — sezione pagamento:
          se c'è una richiesta in attesa, il blocco completo con importo,
          causale e QR EPC dinamici; altrimenti solo IBAN/intestatario in
          sola lettura, sempre disponibili come verifica anti-spoofing
          indipendente dall'email (HANDOFF §Canali). */}
      {pay?.payment_status === "pending_payment" && pay.requested_tier && me ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Pagamento</h2>
          <PaymentRequestCard
            requestedTier={pay.requested_tier}
            requestedTierDetail={pay.requested_tier_detail}
            amountCents={pay.payment_amount_cents ?? 0}
            fullName={fullName(me)}
            profileId={me.id}
          />
        </section>
      ) : (
        bank && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg text-foreground">Pagamento</h2>
            <Card className="flex flex-col gap-2 text-sm">
              <Row label="IBAN" value={bank.iban} />
              <Row label="Intestatario" value={bank.holder} />
            </Card>
          </section>
        )
      )}

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-foreground">Profilo atleta</h2>
          <Link
            href="/app/profilo/crea"
            className="text-sm font-bold text-blu"
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
                    <span className="font-bold text-foreground">
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
            <Link href="/app/profilo/crea" className="font-bold text-blu">
              Inizia →
            </Link>
          </Card>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">Sicurezza</h2>
        <Card>
          <MfaSettings />
        </Card>
      </section>

      {(tokenAvail > 0 || tokens.length > 0) && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Token lezione</h2>
          {tokenAvail > 0 ? (
            <Card className="text-foreground">
              Hai{" "}
              <span className="font-bold">
                {tokenAvail === 1
                  ? "1 lezione inclusa"
                  : `${tokenAvail} lezioni incluse`}
              </span>{" "}
              questo mese. La usi in fase di prenotazione.
            </Card>
          ) : (
            <Card className="text-muted">
              Nessun token disponibile al momento.
            </Card>
          )}
          {tokens.filter((t) => t.redeemed_at || !isTokenAvailable(t)).length >
            0 && (
            <div className="flex flex-col gap-1 text-sm text-muted">
              {tokens
                .filter((t) => t.redeemed_at || !isTokenAvailable(t))
                .slice(0, 5)
                .map((t) => (
                  <p key={t.id}>
                    {t.redeemed_at
                      ? `Usato il ${new Date(t.redeemed_at).toLocaleDateString("it-IT")}`
                      : "Scaduto"}
                    {t.source === "coach" ? " · regalo del coach" : ""}
                  </p>
                ))}
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">I miei tempi</h2>
        <p className="text-sm text-muted">
          I tuoi personal best su tutte le gare individuali.
        </p>
        <PbManager items={(pbs ?? []) as Pb[]} />
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
        </div>
        <Link
          href="/app/abbonamenti"
          className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 hover:border-blu"
        >
          <div>
            <p className="font-bold text-foreground">Vedi i piani</p>
            <p className="text-sm text-muted">
              Canale Open e Percorso 1:1 — scegli e confronta.
            </p>
          </div>
          <span className="rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-2.5 text-sm font-bold text-white">
            Apri
          </span>
        </Link>
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
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}
