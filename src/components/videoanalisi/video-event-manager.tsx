import { Card, Pill } from "@/components/ui/card";
import {
  generateRunsheet,
  reorderRunsheet,
  recompactRunsheet,
  publishRunsheet,
  closeVideoEvent,
  setRunStatus,
  setSignupStatus,
} from "@/app/coach/agenda/videoanalisi-actions";
import type { CapacityLevel } from "@/lib/events/runsheet";

type EventInfo = {
  id: string;
  title: string;
  location: string | null;
  window_start: string | null;
  window_end: string | null;
  lanes: number;
  capacity: number | null;
  runsheet_status: string;
};
type Signup = {
  id: string;
  name: string;
  status: string;
  codes: string[];
  packageMin: number;
};
type Run = {
  id: string;
  signup_id: string;
  name: string;
  codes: string[];
  position: number;
  lane: number;
  warmup_at: string;
  test_at: string;
  out_at: string;
  status: string;
};

const hm = (iso: string) =>
  new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
const dayHm = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("it-IT", {
        timeZone: "Europe/Rome",
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : "—";

function semaforo(level: CapacityLevel, overrun: number) {
  if (level === "green")
    return {
      tone: "ok" as const,
      dot: "🟢",
      msg: `Ci stai comodo: restano ${-overrun} min. Puoi accettare ancora qualche nuotatore.`,
    };
  if (level === "yellow")
    return {
      tone: "warn" as const,
      dot: "🟡",
      msg: "Mezza giornata piena. Conviene chiudere le iscrizioni.",
    };
  return {
    tone: "bad" as const,
    dot: "🔴",
    msg: `Sfori di ${overrun} min. Leve: aggiungi una corsia · togli un test a 2 nuotatori · sposta 1 al pomeriggio.`,
  };
}

const STATUS_LABEL: Record<string, string> = {
  atteso: "Atteso",
  riscaldamento: "Scalda",
  in_acqua: "In acqua",
  fatto: "Fatto",
  assente: "Assente",
};

export function VideoEventManager({
  event,
  overrun,
  level,
  signups,
  runsheet,
}: {
  event: EventInfo;
  overrun: number;
  level: CapacityLevel;
  signups: Signup[];
  runsheet: Run[];
}) {
  const sem = semaforo(level, overrun);
  const order = runsheet.map((r) => r.signup_id);
  const published = event.runsheet_status === "published";
  const inWater = runsheet.find((r) => r.status === "in_acqua");
  const next = runsheet.find(
    (r) => r.status === "atteso" || r.status === "riscaldamento",
  );

  const swap = (i: number, j: number) => {
    const a = [...order];
    [a[i], a[j]] = [a[j], a[i]];
    return a.join(",");
  };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="t-h2">{event.title}</h1>
          {published ? (
            <Pill tone="ok">Pubblicata</Pill>
          ) : (
            <Pill tone="warn">Bozza</Pill>
          )}
        </div>
        <p className="t-small text-muted">
          {dayHm(event.window_start)} → {hm(event.window_end ?? event.window_start ?? "")}
          {event.location ? ` · ${event.location}` : ""} · {event.lanes} corsie
        </p>
      </header>

      {/* Semaforo capienza */}
      <Card className={sem.tone === "bad" ? "border-red-500/30" : ""}>
        <div className="flex items-start gap-3">
          <span className="text-xl">{sem.dot}</span>
          <div>
            <p className="font-semibold">
              {signups.filter((s) => s.status === "in" || s.status === "attended").length}
              /{event.capacity ?? "∞"} accettati
            </p>
            <p className="t-small text-muted">{sem.msg}</p>
          </div>
        </div>
      </Card>

      {/* Iscrizioni */}
      <Card>
        <h2 className="t-h3 mb-3">Iscrizioni</h2>
        {signups.length === 0 ? (
          <p className="t-small text-muted">Ancora nessun iscritto.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {signups.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <span className="font-semibold">{s.name}</span>
                <span className="flex flex-wrap gap-1">
                  {s.codes.map((c) => (
                    <Pill key={c} tone="neutral">{c}</Pill>
                  ))}
                </span>
                <span className="t-small text-muted">{s.packageMin}′ in acqua</span>
                <span className="ml-auto flex items-center gap-2">
                  {s.status === "waitlist" ? (
                    <>
                      <Pill tone="warn">Lista d&apos;attesa</Pill>
                      <form action={setSignupStatus}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="status" value="in" />
                        <button className="rounded-md bg-blu px-2 py-1 text-xs font-semibold text-white">Accetta</button>
                      </form>
                    </>
                  ) : (
                    <>
                      <Pill tone="ok">Accettato</Pill>
                      <form action={setSignupStatus}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="status" value="waitlist" />
                        <button className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-surface">In attesa</button>
                      </form>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Scaletta */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="t-h3">Scaletta</h2>
          <div className="ml-auto flex flex-wrap gap-2">
            <form action={generateRunsheet}>
              <input type="hidden" name="event_id" value={event.id} />
              <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink hover:bg-background">
                {runsheet.length ? "Rigenera" : "Genera scaletta"}
              </button>
            </form>
            {runsheet.length > 0 && (
              <>
                <form action={recompactRunsheet}>
                  <input type="hidden" name="event_id" value={event.id} />
                  <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-background">
                    Ricompatta (togli assenti)
                  </button>
                </form>
                {!published && (
                  <form action={publishRunsheet}>
                    <input type="hidden" name="event_id" value={event.id} />
                    <button className="rounded-lg bg-blu px-3 py-1.5 text-xs font-semibold text-white">
                      Pubblica scaletta
                    </button>
                  </form>
                )}
                <form action={closeVideoEvent}>
                  <input type="hidden" name="event_id" value={event.id} />
                  <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-navy hover:bg-background">
                    Chiudi → coda video
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {runsheet.length === 0 ? (
          <p className="t-small text-muted">
            Genera la scaletta quando le iscrizioni sono chiuse. Finché è in
            bozza, il nuotatore non vede orari.
          </p>
        ) : (
          <>
            {/* Riepilogo LIVE */}
            {published && (
              <div className="mb-3 grid gap-2 rounded-xl bg-ink p-3 text-white sm:grid-cols-2">
                <div>
                  <p className="t-label text-white/50">Ora in acqua</p>
                  <p className="font-semibold">
                    {inWater ? `${inWater.name} · corsia ${inWater.lane}` : "—"}
                  </p>
                </div>
                <div>
                  <p className="t-label text-white/50">Prossimo</p>
                  <p className="font-semibold">
                    {next ? `${next.name} · ${hm(next.test_at)}` : "—"}
                  </p>
                </div>
              </div>
            )}

            <ul className="flex flex-col gap-2">
              {runsheet.map((r, i) => (
                <li
                  key={r.id}
                  className={`rounded-lg border px-3 py-2 ${
                    r.status === "in_acqua"
                      ? "border-blu bg-blu/10"
                      : r.status === "assente"
                        ? "border-border bg-background opacity-50"
                        : "border-border bg-background"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-ink text-xs font-bold text-white">
                      {r.position}
                    </span>
                    <span className="font-semibold">{r.name}</span>
                    <span className="flex flex-wrap gap-1">
                      {r.codes.map((c) => (
                        <Pill key={c} tone="neutral">{c}</Pill>
                      ))}
                    </span>
                    <span className="t-data ml-auto">
                      {hm(r.warmup_at)} scalda · {hm(r.test_at)} in acqua · {hm(r.out_at)} fuori · corsia {r.lane}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {/* reorder */}
                    {i > 0 && (
                      <form action={reorderRunsheet}>
                        <input type="hidden" name="event_id" value={event.id} />
                        <input type="hidden" name="order" value={swap(i, i - 1)} />
                        <button className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-surface" title="Su">↑</button>
                      </form>
                    )}
                    {i < runsheet.length - 1 && (
                      <form action={reorderRunsheet}>
                        <input type="hidden" name="event_id" value={event.id} />
                        <input type="hidden" name="order" value={swap(i, i + 1)} />
                        <button className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:bg-surface" title="Giù">↓</button>
                      </form>
                    )}
                    <span className="mx-1 h-4 w-px bg-border" />
                    {/* live status */}
                    {(["riscaldamento", "in_acqua", "fatto", "assente"] as const).map(
                      (st) => (
                        <form key={st} action={setRunStatus}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="status" value={st} />
                          <button
                            className={`rounded-md px-2 py-1 text-xs font-semibold ${
                              r.status === st
                                ? "bg-blu text-white"
                                : "border border-border text-muted hover:bg-surface"
                            }`}
                          >
                            {STATUS_LABEL[st]}
                          </button>
                        </form>
                      ),
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
