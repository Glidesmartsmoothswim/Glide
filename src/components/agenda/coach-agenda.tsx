"use client";

import { useActionState, useState } from "react";
import { Card, Pill } from "@/components/ui/card";
import {
  addRule,
  deleteRule,
  duplicateRuleAllWeek,
  duplicateWeekToNext,
  closeDay,
  addExtra,
  deleteException,
  completeBooking,
  noShowBooking,
  confirmBooking,
  rejectBooking,
  markCollected,
  createEvent,
  cancelEvent,
  type AgendaState,
} from "@/app/coach/agenda/actions";

const WD = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
const KINDS = [
  "clinic_tecnica",
  "test_set",
  "open_water",
  "raduno",
  "gara_master",
  "trasferta",
  "webinar",
  "consulenza_gruppo",
  "challenge",
  "chiusura_piscina",
];

type Rule = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_step: number;
  modes: string[];
  label: string | null;
};
type Exc = {
  id: string;
  day: string;
  kind: string;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
};
type Booking = {
  id: string;
  swimmer: string;
  service: string;
  starts_at: string;
  ends_at: string;
  mode: string;
  status: string;
  payment: string;
  payment_method: string;
  payment_status: string | null;
  amount_cents: number | null;
  coach_note: string | null;
  swimmer_note: string | null;
};
type CashRow = {
  id: string;
  swimmer: string;
  service: string;
  starts_at: string;
  payment_status: string | null;
  amount_cents: number | null;
  receipt_number: string | null;
  paid_at: string | null;
};
type Ev = {
  id: string;
  title: string;
  kind: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  mode: string;
  capacity: number | null;
  blocks_calendar: boolean;
  status: string;
};

const hhmm = (t: string) => t.slice(0, 5);
const mins = (t: string) => {
  const [h, m] = hhmm(t).split(":").map(Number);
  return h * 60 + m;
};
const fmtMin = (n: number) =>
  `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

const dt = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
const dayLabel = (d: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${d}T12:00:00Z`));

function ModeBadge({ m }: { m: string }) {
  return m === "remote" ? (
    <Pill tone="ok">Remoto</Pill>
  ) : (
    <Pill tone="brand">Vasca</Pill>
  );
}
function PayBadge({ b }: { b: Booking }) {
  // Cash: navy, non rosso — è un promemoria, non un errore (ADR-010).
  if (b.payment_method === "cash") {
    return b.payment_status === "incassato" ? (
      <Pill tone="ok">Incassato</Pill>
    ) : (
      <span className="inline-flex items-center rounded-full border border-navy/40 bg-navy/10 px-2.5 py-0.5 text-xs font-semibold text-navy">
        Da incassare{b.amount_cents != null ? ` · ${euroCents(b.amount_cents)}` : ""}
      </span>
    );
  }
  if (b.payment === "credit") return <Pill tone="brand">Credito</Pill>;
  if (b.payment === "paid") return <Pill tone="ok">Pagato</Pill>;
  if (b.payment === "pending") return <Pill tone="warn">In attesa</Pill>;
  return <Pill tone="neutral">Simulato</Pill>;
}

const euroCents = (c: number) => `€${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;

const TABS = ["Disponibilità", "Prenotazioni", "Eventi", "Cassa"] as const;

export function CoachAgenda({
  rules,
  exceptions,
  bookings,
  events,
  cassa,
  initialTab,
}: {
  rules: Rule[];
  exceptions: Exc[];
  bookings: Booking[];
  events: Ev[];
  cassa: CashRow[];
  initialTab?: string;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>(
    initialTab === "cassa" ? "Cassa" : "Disponibilità",
  );
  const daIncassare = cassa.filter((c) => c.payment_status === "da_incassare");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              tab === t ? "bg-blu text-white" : "text-muted hover:bg-background"
            }`}
          >
            {t}
            {t === "Cassa" && daIncassare.length > 0 && (
              <span className="ml-1.5 rounded-full bg-navy px-1.5 py-0.5 text-[10px] text-white">
                {daIncassare.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "Disponibilità" && (
        <AvailabilityTab rules={rules} exceptions={exceptions} />
      )}
      {tab === "Prenotazioni" && <BookingsTab bookings={bookings} />}
      {tab === "Eventi" && <EventsTab events={events} />}
      {tab === "Cassa" && <CassaTab cassa={cassa} />}
    </div>
  );
}

// ---------------- Disponibilità ----------------
function AvailabilityTab({ rules, exceptions }: { rules: Rule[]; exceptions: Exc[] }) {
  const [state, action] = useActionState<AgendaState, FormData>(addRule, {});
  const [dupState, dupAction] = useActionState<AgendaState, FormData>(
    duplicateWeekToNext,
    {},
  );
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("14:30");
  const [step, setStep] = useState(15);

  const s = mins(start);
  const e = mins(end);
  const preview =
    e > s
      ? `partenze ogni ${step}' · ultima 60' alle ${fmtMin(e - 60)} · ultima 30' alle ${fmtMin(e - 30)}`
      : "la fine dev'essere dopo l'inizio";

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="t-h3 mb-3">Nuova finestra</h2>
        <form action={action} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="t-label text-muted">Giorno</span>
              <select name="weekday" defaultValue="1" className="rounded-lg border border-border bg-background px-2 py-2">
                {WD.map((w, i) => (
                  <option key={i} value={i}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="t-label text-muted">Inizio</span>
              <input type="time" name="start_time" value={start} onChange={(ev) => setStart(ev.target.value)} className="rounded-lg border border-border bg-background px-2 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="t-label text-muted">Fine</span>
              <input type="time" name="end_time" value={end} onChange={(ev) => setEnd(ev.target.value)} className="rounded-lg border border-border bg-background px-2 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="t-label text-muted">Passo</span>
              <select name="slot_step" value={step} onChange={(ev) => setStep(Number(ev.target.value))} className="rounded-lg border border-border bg-background px-2 py-2">
                {[10, 15, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    {n}&apos;
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="modes" value="pool" defaultChecked /> Vasca
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="modes" value="remote" /> Remoto
            </label>
            <input name="label" placeholder="Etichetta (es. Pausa pranzo)" className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <p className="t-small text-muted">{preview}</p>
          {state.error && <p className="t-small text-[#DC2626]">{state.error}</p>}
          {state.info && <p className="t-small text-blu">{state.info}</p>}
          <button className="self-start rounded-lg bg-blu px-4 py-2 text-sm font-semibold text-white">
            Aggiungi finestra
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="t-h3 mb-3">Finestre attive</h2>
        {rules.length === 0 ? (
          <p className="t-small text-muted">Nessuna finestra: aggiungine una sopra.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rules.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                <span className="grid h-8 w-10 place-items-center rounded-md bg-ink text-xs font-bold text-white">
                  {WD[r.weekday]}
                </span>
                <span className="t-data">
                  {hhmm(r.start_time)}–{hhmm(r.end_time)}
                </span>
                <span className="t-small text-muted">ogni {r.slot_step}&apos;</span>
                <div className="flex gap-1">
                  {r.modes.map((m) => (
                    <ModeBadge key={m} m={m} />
                  ))}
                </div>
                {r.label && <span className="t-small text-muted">· {r.label}</span>}
                <div className="ml-auto flex gap-2">
                  <form action={duplicateRuleAllWeek}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-surface">
                      Duplica su tutta la settimana
                    </button>
                  </form>
                  <form action={deleteRule}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="rounded-md border border-border px-2 py-1 text-xs text-[#DC2626] hover:bg-surface">
                      Elimina
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card>
          <h2 className="t-h3 mb-3">Chiudi un giorno</h2>
          <form action={closeDay} className="flex flex-col gap-2">
            <input type="date" name="day" required className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <input name="note" placeholder="Motivo (facoltativo)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <button className="self-start rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink hover:bg-background">
              Chiudi giorno
            </button>
          </form>
        </Card>
        <Card>
          <h2 className="t-h3 mb-3">Apertura extra</h2>
          <form action={addExtra} className="flex flex-col gap-2">
            <input type="date" name="day" required className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <input type="time" name="start_time" required className="flex-1 rounded-lg border border-border bg-background px-2 py-2 text-sm" />
              <input type="time" name="end_time" required className="flex-1 rounded-lg border border-border bg-background px-2 py-2 text-sm" />
            </div>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="modes" value="pool" defaultChecked /> Vasca
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="modes" value="remote" /> Remoto
              </label>
            </div>
            <button className="self-start rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink hover:bg-background">
              Aggiungi apertura
            </button>
          </form>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="t-h3">Duplica la settimana</h2>
            <p className="t-small text-muted">
              Copia le aperture extra di questa settimana su quella successiva.
              Le finestre ricorrenti si ripetono già da sole.
            </p>
          </div>
          <form action={dupAction}>
            <button className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-ink hover:bg-background">
              Duplica sulla settimana successiva
            </button>
          </form>
        </div>
        {dupState.info && (
          <p className="mt-2 t-small text-teal">{dupState.info}</p>
        )}
        {dupState.error && (
          <p className="mt-2 t-small text-[#DC2626]">{dupState.error}</p>
        )}
      </Card>

      {exceptions.length > 0 && (
        <Card>
          <h2 className="t-h3 mb-3">Eccezioni in arrivo</h2>
          <ul className="flex flex-col gap-2">
            {exceptions.map((x) => (
              <li key={x.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <Pill tone={x.kind === "closed" ? "bad" : "ok"}>
                  {x.kind === "closed" ? "Chiuso" : "Extra"}
                </Pill>
                <span className="t-data">{dayLabel(x.day)}</span>
                {x.start_time && (
                  <span className="text-muted">
                    {hhmm(x.start_time)}–{x.end_time ? hhmm(x.end_time) : ""}
                  </span>
                )}
                {x.note && <span className="text-muted">· {x.note}</span>}
                <form action={deleteException} className="ml-auto">
                  <input type="hidden" name="id" value={x.id} />
                  <button className="rounded-md border border-border px-2 py-1 text-xs text-[#DC2626] hover:bg-surface">
                    Rimuovi
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ---------------- Prenotazioni ----------------
function BookingsTab({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0)
    return (
      <Card>
        <p className="t-small text-muted">Nessuna prenotazione nei prossimi giorni.</p>
      </Card>
    );
  return (
    <div className="flex flex-col gap-3">
      {bookings.map((b) => (
        <Card key={b.id}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-blu to-navy text-xs font-bold text-white">
              {b.swimmer.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="font-semibold">{b.swimmer}</p>
              <p className="t-small text-muted">
                {b.service} · {dt(b.starts_at)}
              </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-1">
              <ModeBadge m={b.mode} />
              <PayBadge b={b} />
              {b.status === "pending" && <Pill tone="warn">Da confermare</Pill>}
              {b.status === "completed" && <Pill tone="ok">Fatta</Pill>}
              {b.status === "no_show" && <Pill tone="bad">Assente</Pill>}
            </div>
          </div>
          {b.swimmer_note && (
            <p className="mt-2 rounded-lg bg-background px-3 py-2 t-small text-muted">
              «{b.swimmer_note}»
            </p>
          )}
          {b.coach_note && (
            <p className="mt-2 t-small text-muted">Nota tua: {b.coach_note}</p>
          )}

          {/* Da confermare: prima il coach accetta (o rifiuta) la richiesta. */}
          {b.status === "pending" && (
            <div className="mt-3 flex flex-col gap-2 rounded-xl border border-navy/20 bg-navy/5 p-3">
              <p className="t-small text-muted">
                Richiesta da confermare. Confermala per bloccare l&apos;orario;
                dopo la lezione segnerai presente o assente.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <form action={confirmBooking}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className="w-full rounded-lg bg-blu px-3 py-2.5 text-sm font-semibold text-white">
                    Conferma lezione
                  </button>
                </form>
                <form action={rejectBooking}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-[#DC2626] hover:bg-background">
                    Rifiuta
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Confermata: presente/assente, blocco pulito e leggibile. */}
          {b.status === "confirmed" && (
            <form action={completeBooking} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="id" value={b.id} />
              <input
                name="coach_note"
                placeholder="Nota post-lezione (facoltativa, si aggancia allo storico)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <button className="w-full rounded-lg bg-blu px-3 py-2.5 text-sm font-semibold text-white">
                  Presente
                </button>
                <button
                  formAction={noShowBooking}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-muted hover:bg-background"
                >
                  Assente
                </button>
              </div>
            </form>
          )}
          {b.payment_method === "cash" && b.payment_status === "da_incassare" && (
            <form action={markCollected} className="mt-2 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={b.id} />
              <input
                name="receipt_number"
                placeholder="N° ricevuta (facoltativo)"
                className="w-44 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <button className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white">
                Segna incassato
              </button>
            </form>
          )}
        </Card>
      ))}
    </div>
  );
}

// ---------------- Cassa (ADR-010/011) ----------------
function CassaTab({ cassa }: { cassa: CashRow[] }) {
  const [period, setPeriod] = useState<"tutto" | "mese">("tutto");
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const inPeriod = (r: CashRow) =>
    period === "tutto" || new Date(r.starts_at) >= monthStart;
  const pending = cassa.filter(
    (r) => r.payment_status === "da_incassare" && inPeriod(r),
  );
  const collected = cassa.filter(
    (r) => r.payment_status === "incassato" && inPeriod(r),
  );
  const tot = (rows: CashRow[]) =>
    rows.reduce((s, r) => s + (r.amount_cents ?? 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        {(["tutto", "mese"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
              period === p
                ? "border-navy bg-navy text-white"
                : "border-border text-muted hover:bg-surface"
            }`}
          >
            {p === "tutto" ? "Tutto" : "Questo mese"}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-baseline justify-between">
          <h2 className="t-h3">Da incassare</h2>
          <span className="t-data text-navy">{euroCents(tot(pending))}</span>
        </div>
        {pending.length === 0 ? (
          <p className="t-small mt-2 text-muted">Niente in sospeso.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {pending.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-navy/30 bg-navy/5 px-3 py-2 text-sm"
              >
                <span className="font-semibold">{r.swimmer}</span>
                <span className="text-muted">{r.service}</span>
                <span className="t-small text-muted">{dt(r.starts_at)}</span>
                <span className="ml-auto t-data text-navy">
                  {r.amount_cents != null ? euroCents(r.amount_cents) : "—"}
                </span>
                <form action={markCollected} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input
                    name="receipt_number"
                    placeholder="N° ricevuta"
                    className="w-32 rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                  />
                  <button className="rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white">
                    Segna incassato
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-baseline justify-between">
          <h2 className="t-h3">Incassato</h2>
          <span className="t-data">{euroCents(tot(collected))}</span>
        </div>
        {collected.length === 0 ? (
          <p className="t-small mt-2 text-muted">Ancora nulla nel periodo.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {collected.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="font-semibold">{r.swimmer}</span>
                <span className="text-muted">{r.service}</span>
                <span className="t-small text-muted">{dt(r.starts_at)}</span>
                {r.receipt_number && (
                  <span className="t-small text-muted">ric. {r.receipt_number}</span>
                )}
                <span className="ml-auto t-data">
                  {r.amount_cents != null ? euroCents(r.amount_cents) : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="t-small text-muted">
        Il registro tiene il conto di cosa è stato incassato e cosa no. A fine
        mese è la lista da portare al commercialista.
      </p>
    </div>
  );
}

// ---------------- Eventi ----------------
function EventsTab({ events }: { events: Ev[] }) {
  const [state, action] = useActionState<AgendaState, FormData>(createEvent, {});
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="t-h3 mb-3">Nuovo evento</h2>
        <form action={action} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="title" placeholder="Titolo" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <select name="kind" defaultValue="clinic_tecnica" className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {k.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <label className="flex flex-col gap-1 text-sm">
              <span className="t-label text-muted">Inizio</span>
              <input type="datetime-local" name="starts_at" className="rounded-lg border border-border bg-background px-2 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="t-label text-muted">Fine</span>
              <input type="datetime-local" name="ends_at" className="rounded-lg border border-border bg-background px-2 py-2" />
            </label>
            <input name="location" placeholder="Luogo" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <select name="mode" defaultValue="pool" className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
              <option value="pool">Vasca</option>
              <option value="remote">Remoto</option>
              <option value="open_water">Acque libere</option>
              <option value="offsite">Fuori sede</option>
            </select>
            <input type="number" name="capacity" placeholder="Capienza (vuoto = illimitata)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <input name="description" placeholder="Descrizione (facoltativa)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="blocks_calendar" defaultChecked /> Oscura le prenotazioni in queste ore
          </label>
          {state.error && <p className="t-small text-[#DC2626]">{state.error}</p>}
          {state.info && <p className="t-small text-blu">{state.info}</p>}
          <button className="self-start rounded-lg bg-blu px-4 py-2 text-sm font-semibold text-white">
            Pubblica evento
          </button>
        </form>
      </Card>

      {events.length > 0 && (
        <Card>
          <h2 className="t-h3 mb-3">Eventi pubblicati</h2>
          <ul className="flex flex-col gap-2">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <span className="font-semibold">{e.title}</span>
                <Pill tone="neutral">{e.kind.replace(/_/g, " ")}</Pill>
                <span className="t-small text-muted">
                  {dt(e.starts_at)} → {dt(e.ends_at)}
                </span>
                {e.capacity != null && (
                  <span className="t-small text-muted">· max {e.capacity}</span>
                )}
                {e.blocks_calendar && <Pill tone="warn">Oscura agenda</Pill>}
                <form action={cancelEvent} className="ml-auto">
                  <input type="hidden" name="id" value={e.id} />
                  <button className="rounded-md border border-border px-2 py-1 text-xs text-[#DC2626] hover:bg-surface">
                    Annulla
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
