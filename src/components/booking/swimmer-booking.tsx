"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";

type Svc = {
  code: string;
  name: string;
  mode: string;
  duration_min: number;
  price_cents: number;
};
type Credit = {
  remoteAllowed: boolean;
  canBookExtra: boolean;
  granted: number;
  used: number;
  remaining: number;
};

const TZ = "Europe/Rome";
const romeDate = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
const dayNum = (d: string) =>
  new Intl.DateTimeFormat("it-IT", { timeZone: TZ, day: "2-digit" }).format(
    new Date(`${d}T12:00:00Z`),
  );
const dayWd = (d: string) =>
  new Intl.DateTimeFormat("it-IT", { timeZone: TZ, weekday: "short" }).format(
    new Date(`${d}T12:00:00Z`),
  );
const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
const fullLabel = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: TZ,
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

function next14(): string[] {
  const out: string[] = [];
  const base = Date.now();
  for (let i = 0; i < 14; i++)
    out.push(romeDate(new Date(base + i * 86_400_000)));
  return out;
}

export function SwimmerBooking({
  services,
  credit,
  stripeEnabled = false,
  tokensAvailable = 0,
}: {
  services: Svc[];
  credit: Credit;
  stripeEnabled?: boolean;
  tokensAvailable?: number;
}) {
  const router = useRouter();
  const [days] = useState(next14());
  const [svc, setSvc] = useState<Svc | null>(null);
  const [slotsByDay, setSlotsByDay] = useState<Record<string, string[] | null>>(
    {},
  );
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [method, setMethod] = useState<"cash" | "stripe">("cash");
  const [useToken, setUseToken] = useState(tokensAvailable > 0);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function pickService(s: Svc) {
    setSvc(s);
    setDay(null);
    setSlot(null);
    setMsg(null);
    setOk(false);
    const init: Record<string, string[] | null> = {};
    days.forEach((d) => (init[d] = null));
    setSlotsByDay(init);
    const results = await Promise.all(
      days.map(async (d) => {
        const r = await fetch(`/api/booking/slots?date=${d}&service=${s.code}`);
        const j = await r.json().catch(() => ({ slots: [] }));
        return [d, (j.slots ?? []) as string[]] as const;
      }),
    );
    setSlotsByDay(Object.fromEntries(results));
  }

  const willUseToken = Boolean(svc) && tokensAvailable > 0 && useToken;
  const willUseCredit = Boolean(svc) && !willUseToken && credit.remaining > 0;
  const priceLabel = !svc
    ? ""
    : willUseToken
      ? "Usi il tuo token — lezione inclusa"
      : willUseCredit
        ? "Usi 1 lezione inclusa"
        : credit.granted > 0
          ? `Credito esaurito · lezione extra €${Math.round(svc.price_cents / 100)}`
          : `Lezione extra €${Math.round(svc.price_cents / 100)}`;

  async function confirm() {
    if (!svc || !slot) return;
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/booking/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        service: svc.code,
        startsAt: slot,
        useToken: willUseToken,
        method: willUseToken || willUseCredit ? undefined : method,
      }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) {
      setOk(true);
      setMsg(
        j.paymentMethod === "cash" && j.amountCents != null
          ? `Prenotazione confermata. Il pagamento (€${Math.round(j.amountCents / 100)}) lo sistemi direttamente con Alessio in vasca.`
          : "Prenotato. La trovi qui sopra fra le tue lezioni.",
      );
      setSlot(null);
      setSvc(null);
      router.refresh();
    } else {
      setMsg(j.error ?? "Non è stato possibile prenotare.");
      if (r.status === 409 && day) {
        const rr = await fetch(
          `/api/booking/slots?date=${day}&service=${svc.code}`,
        );
        const jj = await rr.json().catch(() => ({ slots: [] }));
        setSlotsByDay((prev) => ({ ...prev, [day]: jj.slots ?? [] }));
        setSlot(null);
      }
    }
  }

  const daySlots = day ? slotsByDay[day] : undefined;

  return (
    <div className="flex flex-col gap-4">
      {ok && msg && (
        <p className="rounded-lg bg-blu/10 px-3 py-2 t-small text-blu">{msg}</p>
      )}

      {/* 1 · servizio */}
      <div>
        <p className="t-label mb-2 text-muted">1 · Scegli il servizio</p>
        <div className="grid grid-cols-2 gap-2">
          {services.map((s) => (
            <button
              key={s.code}
              onClick={() => pickService(s)}
              className={`rounded-xl border p-3 text-left transition-colors ${
                svc?.code === s.code
                  ? "border-blu bg-blu/10"
                  : "border-border bg-surface hover:border-blu/40"
              }`}
            >
              <p className="font-semibold">{s.name.split(" · ")[0]}</p>
              <p className="t-small text-muted">{s.duration_min}′ · {s.mode === "remote" ? "Video" : "Vasca"}</p>
            </button>
          ))}
        </div>
        {svc && <p className="t-small mt-2 text-muted">{priceLabel}</p>}
      </div>

      {/* 2 · giorno */}
      {svc && (
        <div>
          <p className="t-label mb-2 text-muted">2 · Scegli il giorno</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((d) => {
              const s = slotsByDay[d];
              const loading = s === null;
              const empty = Array.isArray(s) && s.length === 0;
              const selected = day === d;
              return (
                <button
                  key={d}
                  disabled={empty || loading}
                  onClick={() => {
                    setDay(d);
                    setSlot(null);
                  }}
                  className={`flex min-w-[52px] flex-col items-center rounded-xl border px-2 py-2 ${
                    selected
                      ? "border-blu bg-blu text-white"
                      : empty
                        ? "border-border bg-background text-muted/40"
                        : "border-border bg-surface text-ink hover:border-blu/40"
                  }`}
                >
                  <span className="t-small capitalize">{dayWd(d)}</span>
                  <span className="t-data">{dayNum(d)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3 · ora */}
      {svc && day && (
        <div>
          <p className="t-label mb-2 text-muted">3 · Scegli l&apos;ora</p>
          {daySlots === null ? (
            <p className="t-small text-muted">Carico gli orari…</p>
          ) : daySlots && daySlots.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {daySlots.map((iso) => (
                <button
                  key={iso}
                  onClick={() => setSlot(iso)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    slot === iso
                      ? "border-blu bg-blu text-white"
                      : "border-border bg-surface text-ink hover:border-blu/40"
                  }`}
                >
                  {timeLabel(iso)}
                </button>
              ))}
            </div>
          ) : (
            <p className="t-small text-muted">Nessun orario libero: prova un altro giorno.</p>
          )}
        </div>
      )}

      {/* riepilogo */}
      {svc && slot && (
        <Card className="border-blu/40">
          <p className="t-h3">Confermi?</p>
          <p className="mt-1 capitalize">{fullLabel(slot)}</p>
          <p className="t-small text-muted">
            {svc.name} ·{" "}
            {svc.mode === "remote" ? "Video call" : "Piscina di Livorno"}
          </p>
          <p className="t-small mt-1 text-muted">{priceLabel}</p>
          {tokensAvailable > 0 && (
            <button
              onClick={() => setUseToken((v) => !v)}
              className={`mt-3 w-full rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                willUseToken
                  ? "border-teal bg-teal/10"
                  : "border-border bg-surface"
              }`}
            >
              Usa il tuo token — lezione inclusa
              <span className="block t-small font-normal text-muted">
                {tokensAvailable === 1
                  ? "Hai 1 lezione inclusa questo mese."
                  : `Hai ${tokensAvailable} lezioni incluse.`}
              </span>
            </button>
          )}
          {!willUseCredit && !willUseToken && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="t-label text-muted">Come paghi</p>
              {stripeEnabled && (
                <button
                  onClick={() => setMethod("stripe")}
                  className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                    method === "stripe"
                      ? "border-blu bg-blu/10"
                      : "border-border bg-surface"
                  }`}
                >
                  Paga ora online
                </button>
              )}
              <button
                onClick={() => setMethod("cash")}
                className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold ${
                  method === "cash"
                    ? "border-navy bg-navy/10"
                    : "border-border bg-surface"
                }`}
              >
                Paga in vasca col coach
                <span className="block t-small font-normal text-muted">
                  Il pagamento (€{Math.round(svc.price_cents / 100)}) lo sistemi
                  direttamente con Alessio.
                </span>
              </button>
            </div>
          )}
          {msg && !ok && <p className="t-small mt-2 text-[#DC2626]">{msg}</p>}
          <button
            onClick={confirm}
            disabled={busy}
            className="mt-3 w-full rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-3 font-bold text-white disabled:opacity-60"
          >
            {busy ? "Prenoto…" : "Prenota"}
          </button>
        </Card>
      )}

      {services.length === 0 && (
        <p className="t-small text-muted">
          Nessun servizio disponibile per il tuo piano.
        </p>
      )}
    </div>
  );
}
