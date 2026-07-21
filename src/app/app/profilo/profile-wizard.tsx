"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2, Trophy, Waves } from "lucide-react";
import { categoriaMaster } from "@/lib/profile/categoria";
import {
  STILI,
  STILE_LABEL,
  DISTANZE_ABITUALI,
  distanzeValide,
  VASCHE,
  type Stile,
} from "@/lib/profile/costanti";
import { formatTempo, parseTempo } from "@/lib/profile/tempo";
import {
  type AthleteType,
  type IntakeRow,
  OBIETTIVI,
  OBIETTIVO_LABEL,
  FREQ,
  ANNI_NUOTO,
  CONTINUITA,
  CONTINUITA_LABEL,
  CORSI,
  CORSI_LABEL,
  STILI_SAI,
  STILE_SAI_LABEL,
  NESSUNO_STILE,
  AUTOVAL_ANCORE,
  AREE,
  AREE_LABEL,
} from "@/lib/profile/intake";
import {
  saveProfileBasics,
  saveIntake,
  setAthleteType,
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
  athlete_type: AthleteType | null;
  anno_nascita: number | null;
  categoria: string | null;
  stili_abituali: string[];
  distanze_abituali: string[];
  personalBests: PB[];
  intake: Partial<IntakeRow> | null;
};

type Step = "type" | "comune" | "specialita" | "tempi" | "storia" | "libero";

const CATEGORIE = [
  "U25",
  ...Array.from({ length: 15 }, (_, i) => `M${25 + i * 5}`),
  "M95+",
];

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
        on ? "border-navy bg-navy text-white" : "border-border bg-surface text-foreground"
      }`}
    >
      {on && <Check size={13} className="mr-1 inline" />}
      {label}
    </button>
  );
}

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
  const [step, setStep] = useState<Step>(
    initial.athlete_type ? "comune" : "type",
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [type, setType] = useState<AthleteType | null>(initial.athlete_type);

  // comune
  const [anno, setAnno] = useState(
    initial.anno_nascita ? String(initial.anno_nascita) : "",
  );
  const [categoria, setCategoria] = useState(initial.categoria ?? "");
  const [catTouched, setCatTouched] = useState(Boolean(initial.categoria));
  const [vasca, setVasca] = useState<number>(initial.intake?.vasca ?? 25);
  const [freq, setFreq] = useState<string>(
    initial.intake?.freq_settimanale ?? "",
  );
  const [obiettivo, setObiettivo] = useState<string>(
    initial.intake?.goal_primary ?? "",
  );
  const [goalNote, setGoalNote] = useState(initial.intake?.goal_note ?? "");

  // percorso A · specialità/tempi/storia
  const [stili, setStili] = useState<string[]>(initial.stili_abituali);
  const [distanze, setDistanze] = useState<string[]>(initial.distanze_abituali);
  const [pbs, setPbs] = useState<PB[]>(initial.personalBests);
  const [anniNuoto, setAnniNuoto] = useState<string>(
    initial.intake?.anni_nuoto ?? "",
  );
  const [continuita, setContinuita] = useState<string>(
    initial.intake?.continuita ?? "",
  );
  const [gare12m, setGare12m] = useState<boolean | null>(
    initial.intake?.gare_12m ?? null,
  );
  const [espInt, setEspInt] = useState<boolean | null>(
    initial.intake?.esperienza_intensita ?? null,
  );
  const [deviceFc, setDeviceFc] = useState<boolean | null>(
    initial.intake?.device_fc ?? null,
  );

  // percorso B · libero
  const [corsi, setCorsi] = useState<string>(initial.intake?.corsi ?? "");
  const [stiliSai, setStiliSai] = useState<string[]>(initial.intake?.stili ?? []);
  const [autoval, setAutoval] = useState<number | null>(
    initial.intake?.autovalutazione ?? null,
  );
  const [aree, setAree] = useState<string[]>(
    initial.intake?.aree_miglioramento ?? [],
  );

  const autoCat = anno ? categoriaMaster(Number(anno)) : "";
  const shownCat = catTouched ? categoria : autoCat;

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  /** Corpo intake corrente (per gli upsert). */
  const intakePayload = () => ({
    goal_primary: obiettivo,
    goal_note: goalNote || null,
    freq_settimanale: freq,
    vasca,
    anni_nuoto: anniNuoto || null,
    continuita: continuita || null,
    gare_12m: gare12m,
    esperienza_intensita: espInt,
    device_fc: deviceFc,
    corsi: corsi || null,
    stili: type === "libero" ? stiliSai : null,
    autovalutazione: type === "libero" ? autoval : null,
    aree_miglioramento: type === "libero" ? aree : null,
  });

  async function chooseType(t: AthleteType) {
    setSaving(true);
    setMsg(null);
    setType(t);
    const res = await setAthleteType(t);
    setSaving(false);
    if (res.error) return setMsg(res.error);
    setStep("comune");
  }

  async function saveComune(next: boolean) {
    setSaving(true);
    setMsg(null);
    // anno/categoria sul profilo
    if (anno)
      await saveProfileBasics({
        anno_nascita: Number(anno),
        categoria: shownCat || null,
      });
    // intake (obbligatori: obiettivo, freq, vasca)
    let ok = true;
    if (obiettivo && freq && vasca) {
      const res = await saveIntake(intakePayload());
      if (res.error) {
        ok = false;
        setMsg(res.error);
      }
    }
    setSaving(false);
    if (next && ok) setStep(type === "libero" ? "libero" : "specialita");
  }

  async function saveSpecialita(next: boolean) {
    setSaving(true);
    setMsg(null);
    const res = await saveProfileBasics({
      stili_abituali: stili,
      distanze_abituali: distanze,
    });
    setSaving(false);
    if (res.error) return setMsg(res.error);
    if (next) setStep("tempi");
  }

  async function saveStoria(finish: boolean) {
    setSaving(true);
    setMsg(null);
    let ok = true;
    if (obiettivo && freq && vasca) {
      const res = await saveIntake(intakePayload());
      if (res.error) {
        ok = false;
        setMsg(res.error);
      }
    }
    setSaving(false);
    if (finish && ok) router.push("/app/profilo");
  }

  async function saveLibero(finish: boolean) {
    setSaving(true);
    setMsg(null);
    let ok = true;
    if (obiettivo && freq && vasca) {
      const res = await saveIntake(intakePayload());
      if (res.error) {
        ok = false;
        setMsg(res.error);
      }
    } else {
      setMsg("Torna indietro e completa obiettivo, frequenza e vasca.");
      ok = false;
    }
    setSaving(false);
    if (finish && ok) router.push("/app/profilo");
  }

  const steps: Step[] =
    type === "libero"
      ? ["type", "comune", "libero"]
      : ["type", "comune", "specialita", "tempi", "storia"];
  const idx = steps.indexOf(step);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 flex-1 rounded-full ${
              i <= idx ? "bg-navy" : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* STEP 0 — Chi sei */}
      {step === "type" && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-xl text-foreground">Chi sei</h2>
            <p className="text-sm text-muted">
              Serve a tararti il percorso giusto. Cambiabile in seguito.
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => chooseType("agonista")}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-left hover:border-blu disabled:opacity-60"
          >
            <Trophy size={26} className="text-navy" />
            <div>
              <p className="font-display text-lg text-foreground">
                Nuoto (anche) in gara
              </p>
              <p className="text-sm text-muted">Master, agonista o ex agonista.</p>
            </div>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => chooseType("libero")}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-left hover:border-blu disabled:opacity-60"
          >
            <Waves size={26} className="text-blu" />
            <div>
              <p className="font-display text-lg text-foreground">Nuoto per me</p>
              <p className="text-sm text-muted">
                Per stare bene, migliorare, costanza. Non è “principiante”.
              </p>
            </div>
          </button>
        </section>
      )}

      {/* STEP comune */}
      {step === "comune" && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-xl text-foreground">Su di te</h2>
            <p className="text-sm text-muted">Pochi dati, poi sei dentro.</p>
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

          {type === "agonista" && anno.length === 4 && (
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">Categoria (auto, correggibile)</span>
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

          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">Vasca abituale</span>
            <div className="flex gap-2">
              {VASCHE.map((v) => (
                <Chip
                  key={v}
                  label={`${v} m`}
                  on={vasca === Number(v)}
                  onClick={() => setVasca(Number(v))}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">Volte a settimana</span>
            <div className="flex flex-wrap gap-2">
              {FREQ.map((f) => (
                <Chip key={f} label={f} on={freq === f} onClick={() => setFreq(f)} />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">Obiettivo principale</span>
            <div className="flex flex-wrap gap-2">
              {OBIETTIVI.map((o) => (
                <Chip
                  key={o}
                  label={OBIETTIVO_LABEL[o]}
                  on={obiettivo === o}
                  onClick={() => setObiettivo(o)}
                />
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">In una frase, cosa cerchi? (facoltativo)</span>
            <input
              value={goalNote ?? ""}
              onChange={(e) => setGoalNote(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-2.5 outline-none focus:border-blu"
            />
          </label>

          {msg && <p className="text-sm text-[#DC2626]">{msg}</p>}
          <StepButtons
            saving={saving}
            onBack={() => setStep("type")}
            onSkip={() => setStep(type === "libero" ? "libero" : "specialita")}
            onNext={() => saveComune(true)}
          />
        </section>
      )}

      {/* STEP specialità (A) */}
      {step === "specialita" && (
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
            onBack={() => setStep("comune")}
            onSkip={() => setStep("tempi")}
            onNext={() => saveSpecialita(true)}
          />
        </section>
      )}

      {/* STEP tempi (A) */}
      {step === "tempi" && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-xl text-foreground">I tuoi tempi</h2>
            <p className="text-sm text-muted">
              Personal best dichiarati. Uno per distanza + stile + vasca.
            </p>
          </div>
          <PBList pbs={pbs} setPbs={setPbs} />
          <PBAdd
            onAdded={(pb) =>
              setPbs((cur) => [
                ...cur.filter(
                  (x) =>
                    !(
                      x.distanza_m === pb.distanza_m &&
                      x.stile === pb.stile &&
                      x.vasca === pb.vasca
                    ),
                ),
                pb,
              ])
            }
          />
          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep("specialita")} className="text-sm text-muted">
              Indietro
            </button>
            <button
              type="button"
              onClick={() => setStep("storia")}
              className="rounded-xl bg-gradient-to-br from-blu to-navy px-5 py-2.5 font-semibold text-white"
            >
              Continua
            </button>
          </div>
        </section>
      )}

      {/* STEP storia (A) */}
      {step === "storia" && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-xl text-foreground">La tua storia</h2>
            <p className="text-sm text-muted">Un rapido inquadramento per il coach.</p>
          </div>
          <Choice
            label="Da quanti anni nuoti"
            options={ANNI_NUOTO.map((v) => [v, v])}
            value={anniNuoto}
            onChange={setAnniNuoto}
          />
          <Choice
            label="Continuità"
            options={CONTINUITA.map((v) => [v, CONTINUITA_LABEL[v]])}
            value={continuita}
            onChange={setContinuita}
          />
          <YesNo label="Gare negli ultimi 12 mesi" value={gare12m} onChange={setGare12m} />
          <YesNo label="Esperienza con lavori a intensità" value={espInt} onChange={setEspInt} />
          <YesNo label="Usi un device per la frequenza cardiaca" value={deviceFc} onChange={setDeviceFc} />
          {msg && <p className="text-sm text-[#DC2626]">{msg}</p>}
          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep("tempi")} className="text-sm text-muted">
              Indietro
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveStoria(true)}
              className="rounded-xl bg-gradient-to-br from-blu to-navy px-5 py-2.5 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Salvo…" : "Fine"}
            </button>
          </div>
        </section>
      )}

      {/* STEP libero (B) */}
      {step === "libero" && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="font-display text-xl text-foreground">Come nuoti</h2>
            <p className="text-sm text-muted">Nessun cronometro, solo tu e l&apos;acqua.</p>
          </div>
          <Choice
            label="Hai mai fatto corsi di nuoto?"
            options={CORSI.map((v) => [v, CORSI_LABEL[v]])}
            value={corsi}
            onChange={setCorsi}
          />
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">Quali stili sai nuotare?</span>
            <div className="flex flex-wrap gap-2">
              {STILI_SAI.map((s) => (
                <Chip
                  key={s}
                  label={STILE_SAI_LABEL[s]}
                  on={stiliSai.includes(s)}
                  onClick={() => toggle(stiliSai, setStiliSai, s)}
                />
              ))}
              <Chip
                label="Nessuno con sicurezza"
                on={stiliSai.includes(NESSUNO_STILE)}
                onClick={() => toggle(stiliSai, setStiliSai, NESSUNO_STILE)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">Come ti giudichi in acqua?</span>
            <div className="flex flex-col gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAutoval(n)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                    autoval === n
                      ? "border-navy bg-navy text-white"
                      : "border-border bg-surface text-foreground"
                  }`}
                >
                  <span className="font-semibold">{n}</span> · {AUTOVAL_ANCORE[n]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">Dove vorresti migliorare?</span>
            <div className="flex flex-wrap gap-2">
              {AREE.map((a) => (
                <Chip
                  key={a}
                  label={AREE_LABEL[a]}
                  on={aree.includes(a)}
                  onClick={() => toggle(aree, setAree, a)}
                />
              ))}
            </div>
          </div>
          {msg && <p className="text-sm text-[#DC2626]">{msg}</p>}
          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep("comune")} className="text-sm text-muted">
              Indietro
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveLibero(true)}
              className="rounded-xl bg-gradient-to-br from-blu to-navy px-5 py-2.5 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Salvo…" : "Fine"}
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

function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, lbl]) => (
          <Chip key={v} label={lbl} on={value === v} onClick={() => onChange(v)} />
        ))}
      </div>
    </div>
  );
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex gap-2">
        <Chip label="Sì" on={value === true} onClick={() => onChange(true)} />
        <Chip label="No" on={value === false} onClick={() => onChange(false)} />
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
        Nessun tempo ancora. Aggiungine uno qui sotto (facoltativo).
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

function PBAdd({ onAdded }: { onAdded: (pb: PB) => void }) {
  const [stile, setStile] = useState<Stile>("SL");
  const [vasca, setVasca] = useState<string>("25");
  const distanze = distanzeValide(stile, vasca);
  const [dist, setDist] = useState<number>(distanze[0]);
  const [t, setT] = useState({ min: "", sec: "", cent: "" });
  const [data, setData] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const cc = parseTempo(t.min, t.sec, t.cent);
  const today = new Date().toISOString().slice(0, 10);

  // Se stile/vasca cambiano e la distanza non è più valida, la riporto valida.
  function pickStile(s: Stile) {
    setStile(s);
    const d = distanzeValide(s, vasca);
    if (!d.includes(dist)) setDist(d[0]);
  }
  function pickVasca(v: string) {
    setVasca(v);
    const d = distanzeValide(stile, v);
    if (!d.includes(dist)) setDist(d[0]);
  }

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
    onAdded({
      id: `${dist}-${stile}-${vasca}`,
      distanza_m: dist,
      stile,
      vasca,
      tempo_cc: cc,
      data_conseguimento: data || null,
    });
    setT({ min: "", sec: "", cent: "" });
    setData("");
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="grid grid-cols-3 gap-2">
        <select
          value={stile}
          onChange={(e) => pickStile(e.target.value as Stile)}
          className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
        >
          {STILI.map((s) => (
            <option key={s} value={s}>
              {STILE_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          value={dist}
          onChange={(e) => setDist(Number(e.target.value))}
          className="rounded-lg border border-border bg-background px-2 py-2 text-sm"
        >
          {distanze.map((d) => (
            <option key={d} value={d}>
              {d} m
            </option>
          ))}
        </select>
        <select
          value={vasca}
          onChange={(e) => pickVasca(e.target.value)}
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
