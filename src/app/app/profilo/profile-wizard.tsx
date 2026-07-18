"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";
import { categoriaMaster } from "@/lib/profile/categoria";
import {
  STILI,
  STILE_LABEL,
  DISTANZE_ABITUALI,
  DISTANZE_PB,
  VASCHE,
  type Stile,
} from "@/lib/profile/costanti";
import { formatTempo, parseTempo } from "@/lib/profile/tempo";
import {
  saveProfileBasics,
  upsertPersonalBest,
  deletePersonalBest,
} from "./actions";

export type PB = {
  id: string;
  distanza_m: number;
  stile: string;
  vasca: string;
  tempo_cc: number;
  data_conseguimento: string | null;
};

export type WizardInitial = {
  anno_nascita: number | null;
  categoria: string | null;
  stili_abituali: string[];
  distanze_abituali: string[];
  personalBests: PB[];
};

const CATEGORIE = [
  "U25",
  ...Array.from({ length: 15 }, (_, i) => `M${25 + i * 5}`),
  "M95+",
];

function Chip({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
        on
          ? "border-navy bg-navy text-white"
          : "border-border bg-surface text-foreground"
      }`}
    >
      {on && <Check size={13} className="mr-1 inline" />}
      {label}
    </button>
  );
}

/** Tre campi MIN : SEC . CENT con avanzamento automatico. */
function TimeInput({
  value,
  onChange,
}: {
  value: { min: string; sec: string; cent: string };
  onChange: (v: { min: string; sec: string; cent: string }) => void;
}) {
  const secRef = useRef<HTMLInputElement>(null);
  const centRef = useRef<HTMLInputElement>(null);

  const cell = (
    name: "min" | "sec" | "cent",
    ref: React.RefObject<HTMLInputElement | null> | null,
    nextRef: React.RefObject<HTMLInputElement | null> | null,
    label: string,
    ph: string,
  ) => (
    <div className="flex flex-col items-center">
      <input
        ref={ref ?? undefined}
        inputMode="numeric"
        maxLength={2}
        placeholder={ph}
        value={value[name]}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
          onChange({ ...value, [name]: digits });
          if (digits.length === 2 && nextRef?.current) nextRef.current.focus();
        }}
        className="w-14 rounded-lg border border-border bg-background px-2 py-2 text-center text-lg outline-none focus:border-blu"
      />
      <span className="mt-1 text-[11px] text-muted">{label}</span>
    </div>
  );

  return (
    <div className="flex items-center gap-1">
      {cell("min", null, secRef, "min", "1")}
      <span className="pb-5 text-lg text-muted">:</span>
      {cell("sec", secRef, centRef, "sec", "05")}
      <span className="pb-5 text-lg text-muted">.</span>
      {cell("cent", centRef, null, "cent", "32")}
    </div>
  );
}

export function ProfileWizard({ initial }: { initial: WizardInitial }) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Passo 1
  const [anno, setAnno] = useState(
    initial.anno_nascita ? String(initial.anno_nascita) : "",
  );
  const [categoria, setCategoria] = useState(initial.categoria ?? "");
  const [catTouched, setCatTouched] = useState(Boolean(initial.categoria));

  // Passo 2
  const [stili, setStili] = useState<string[]>(initial.stili_abituali);
  const [distanze, setDistanze] = useState<string[]>(initial.distanze_abituali);

  // Passo 3
  const [pbs, setPbs] = useState<PB[]>(initial.personalBests);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const autoCat = anno ? categoriaMaster(Number(anno)) : "";
  const shownCat = catTouched ? categoria : autoCat;

  const toggle = (
    list: string[],
    set: (v: string[]) => void,
    v: string,
  ) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function saveStep1(next: boolean) {
    setSaving(true);
    setMsg(null);
    const res = await saveProfileBasics({
      anno_nascita: anno ? Number(anno) : null,
      categoria: shownCat || null,
    });
    setSaving(false);
    if (res.error) return setMsg(res.error);
    if (next) setStep(2);
  }

  async function saveStep2(next: boolean) {
    setSaving(true);
    setMsg(null);
    const res = await saveProfileBasics({
      stili_abituali: stili,
      distanze_abituali: distanze,
    });
    setSaving(false);
    if (res.error) return setMsg(res.error);
    if (next) setStep(3);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-1.5 flex-1 rounded-full ${
              n <= step ? "bg-navy" : "bg-border"
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-xl text-foreground">Chi sei</h2>
            <p className="text-sm text-muted">
              L&apos;anno di nascita ci dà la categoria Master.
            </p>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Anno di nascita</span>
            <input
              inputMode="numeric"
              placeholder="es. 1988"
              value={anno}
              onChange={(e) => {
                setAnno(e.target.value.replace(/\D/g, "").slice(0, 4));
                setCatTouched(false);
              }}
              className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
            />
          </label>
          {anno.length === 4 && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">
                Categoria <span className="text-muted">(auto, correggibile)</span>
              </span>
              <select
                value={shownCat}
                onChange={(e) => {
                  setCategoria(e.target.value);
                  setCatTouched(true);
                }}
                className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
              >
                {CATEGORIE.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          )}
          {msg && <p className="text-sm text-[#DC2626]">{msg}</p>}
          <StepButtons
            saving={saving}
            onSkip={() => setStep(2)}
            onNext={() => saveStep1(true)}
          />
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-xl text-foreground">
              Le tue specialità
            </h2>
            <p className="text-sm text-muted">Quello che nuoti di solito.</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">Stili</span>
            <div className="flex flex-wrap gap-2">
              {STILI.map((s) => (
                <Chip
                  key={s}
                  label={STILE_LABEL[s]}
                  on={stili.includes(s)}
                  onClick={() => toggle(stili, setStili, s)}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">Distanze</span>
            <div className="flex flex-wrap gap-2">
              {DISTANZE_ABITUALI.map((d) => (
                <Chip
                  key={d}
                  label={d === "Fondo" ? "Fondo / Acque libere" : `${d} m`}
                  on={distanze.includes(d)}
                  onClick={() => toggle(distanze, setDistanze, d)}
                />
              ))}
            </div>
          </div>
          {msg && <p className="text-sm text-[#DC2626]">{msg}</p>}
          <StepButtons
            saving={saving}
            onSkip={() => setStep(3)}
            onNext={() => saveStep2(true)}
            onBack={() => setStep(1)}
          />
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-xl text-foreground">I tuoi tempi</h2>
            <p className="text-sm text-muted">
              Personal best dichiarati. Uno per distanza + stile + vasca.
            </p>
          </div>

          <PBList pbs={pbs} setPbs={setPbs} />
          <PBAdd
            onAdded={(pb, updated) => {
              setPbs((cur) => {
                const rest = cur.filter(
                  (x) =>
                    !(
                      x.distanza_m === pb.distanza_m &&
                      x.stile === pb.stile &&
                      x.vasca === pb.vasca
                    ),
                );
                return [...rest, pb];
              });
              setMsg(updated ? "Tempo aggiornato." : "Tempo aggiunto.");
            }}
          />
          {msg && <p className="text-sm text-teal">{msg}</p>}

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm text-muted"
            >
              Indietro
            </button>
            <button
              type="button"
              onClick={() => router.push("/app/profilo")}
              className="rounded-xl bg-gradient-to-br from-blu to-navy px-5 py-2.5 font-semibold text-white"
            >
              Fine
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function StepButtons({
  saving,
  onNext,
  onSkip,
  onBack,
}: {
  saving: boolean;
  onNext: () => void;
  onSkip: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-2">
      {onBack ? (
        <button type="button" onClick={onBack} className="text-sm text-muted">
          Indietro
        </button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onSkip} className="text-sm text-muted">
          Completa più tardi
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onNext}
          className="rounded-xl bg-gradient-to-br from-blu to-navy px-5 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {saving ? "Salvo…" : "Continua"}
        </button>
      </div>
    </div>
  );
}

function PBList({ pbs, setPbs }: { pbs: PB[]; setPbs: (v: PB[]) => void }) {
  const sorted = [...pbs].sort(
    (a, b) =>
      a.stile.localeCompare(b.stile) ||
      a.distanza_m - b.distanza_m ||
      a.vasca.localeCompare(b.vasca),
  );
  if (sorted.length === 0)
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
        Nessun tempo ancora. Aggiungine uno qui sotto.
      </p>
    );
  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((pb) => (
        <li
          key={pb.id}
          className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        >
          <span>
            <span className="font-semibold text-foreground">
              {pb.distanza_m} {pb.stile}
            </span>{" "}
            <span className="text-muted">
              (vasca {pb.vasca}) · {formatTempo(pb.tempo_cc)}
            </span>
          </span>
          <button
            type="button"
            onClick={async () => {
              const res = await deletePersonalBest(pb.id);
              if (!res.error) setPbs(pbs.filter((x) => x.id !== pb.id));
            }}
            className="text-muted hover:text-[#DC2626]"
            aria-label="Rimuovi"
          >
            <Trash2 size={16} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function PBAdd({ onAdded }: { onAdded: (pb: PB, updated: boolean) => void }) {
  const [dist, setDist] = useState<number>(100);
  const [stile, setStile] = useState<Stile>("SL");
  const [vasca, setVasca] = useState<string>("25");
  const [t, setT] = useState({ min: "", sec: "", cent: "" });
  const [data, setData] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cc = parseTempo(t.min, t.sec, t.cent);
  const today = new Date().toISOString().slice(0, 10);

  async function add() {
    setErr(null);
    if (cc === null) return setErr("Inserisci un tempo valido.");
    setSaving(true);
    const res = await upsertPersonalBest({
      distanza_m: dist,
      stile,
      vasca,
      tempo_cc: cc,
      data_conseguimento: data || null,
    });
    setSaving(false);
    if (res.error) return setErr(res.error);
    onAdded(
      {
        id: `${dist}-${stile}-${vasca}`,
        distanza_m: dist,
        stile,
        vasca,
        tempo_cc: cc,
        data_conseguimento: data || null,
      },
      Boolean(res.updated),
    );
    setT({ min: "", sec: "", cent: "" });
    setData("");
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="grid grid-cols-3 gap-2">
        <select
          value={dist}
          onChange={(e) => setDist(Number(e.target.value))}
          className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
        >
          {DISTANZE_PB.map((d) => (
            <option key={d} value={d}>
              {d} m
            </option>
          ))}
        </select>
        <select
          value={stile}
          onChange={(e) => setStile(e.target.value as Stile)}
          className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
        >
          {STILI.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={vasca}
          onChange={(e) => setVasca(e.target.value)}
          className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
        >
          {VASCHE.map((v) => (
            <option key={v} value={v}>
              Vasca {v}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TimeInput value={t} onChange={setT} />
        {cc !== null && (
          <span className="text-lg font-semibold text-foreground">
            {formatTempo(cc)}
          </span>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted">Data (facoltativa)</span>
        <input
          type="date"
          max={today}
          value={data}
          onChange={(e) => setData(e.target.value)}
          className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
        />
      </label>

      {err && <p className="text-sm text-[#DC2626]">{err}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={add}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:border-blu disabled:opacity-60"
      >
        <Plus size={16} /> {saving ? "Salvo…" : "Aggiungi tempo"}
      </button>
    </div>
  );
}
