import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Card, Pill } from "@/components/ui/card";
import { WorkoutEditor } from "@/components/workout/editor";
import { CoachWorkoutCard } from "@/components/workout/coach-workout-card";
import { ReadinessProgress } from "@/components/readiness/progress";
import { EfficiencyCurves, type EffPoint } from "@/components/readiness/efficiency";
import { OndaCard, GlideScoreCard } from "@/components/score/score-cards";
import { OpenRecapPie, type PieSlice } from "@/components/coach/open-recap-pie";
import { Torta } from "@/components/charts/Torta";
import { CurvaCarico } from "@/components/charts/CurvaCarico";
import {
  distribuzioneWorkout,
  buildSettimane,
  toFette,
  type WorkoutForStats,
} from "@/lib/workout-stats";
import type { ZonaBucket } from "@/lib/chart-tokens";
import { computeScore } from "@/lib/score/compute";
import { IdentityCard } from "@/components/identity/identity-card";
import { computeIdentity } from "@/lib/identity/compute";
import type { VReadinessRow } from "@/lib/readiness";
import { formatTempo } from "@/lib/profile/tempo";
import { STILE_LABEL, type Stile } from "@/lib/profile/costanti";
import {
  livelloLibero,
  OBIETTIVO_LABEL,
  ATHLETE_LABEL,
} from "@/lib/profile/intake";
import { ProgramManager } from "./program-manager";
import type { ProgramRow, PhaseRow } from "@/lib/programs";
import {
  OBJECTIVE_KIND_LABEL,
  OBJECTIVE_STATUS_LABEL,
  type ObjectiveRow,
} from "@/lib/objectives";
import { availableCount, type LessonTokenRow } from "@/lib/tokens";
import { GiftToken } from "./gift-token";
import { PricingPanel } from "./pricing-panel";
import { savePersonalWorkout } from "../../workout-actions";
import { archiveSwimmer } from "../actions";
import { EditSwimmerForm } from "./edit-form";
import { PaymentPanel } from "./payment-panel";
import { gateState, daysOverdue } from "@/lib/payment/gate";
import type { SubTier } from "@/lib/payment/pricing";
import { SwimmerTabs, type SwimmerTabKey } from "./swimmer-tabs";
import { CommentForm } from "@/app/coach/video/comment-form";
import { markReviewed, unlockPaidVideo } from "@/app/coach/video/actions";
import { VideoActions } from "@/app/app/video/video-actions";
import { STATUS_LABEL as VIDEO_STATUS_LABEL, type VideoRow, type VideoCommentRow } from "@/lib/video";
import { TIER_LABEL } from "@/lib/access";
import {
  SERVICE_LABEL,
  STATUS_LABEL,
  fullName,
  initials,
  type SwimmerRow,
  type SwimmerStatus,
  type WorkoutRow,
} from "@/lib/types";

export default async function SwimmerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Onda 14.2: una sola lettura profili (con le colonne "atleta"), poi tutte
  // le query indipendenti in parallelo (Promise.all) invece che a cascata.
  const { data: s } = await supabase
    .from("profiles")
    .select(
      "id, role, first_name, last_name, email, phone, service_type, tier, level, package, status, member_since, athlete_type, anno_nascita, categoria, stili_abituali, distanze_abituali, tier_expires_at, requested_tier, requested_tier_detail, payment_status, payment_amount_cents, receipt_number, paid_at, group_lesson_affiliate, extra_lesson_price_override_cents",
    )
    .eq("id", id)
    .single();

  if (!s) notFound();
  const swimmer = s as SwimmerRow;
  const ath = s as {
    athlete_type: string | null;
    anno_nascita: number | null;
    categoria: string | null;
    stili_abituali: string[];
    distanze_abituali: string[];
  };
  const pay = s as {
    tier_expires_at: string | null;
    requested_tier: SubTier | null;
    requested_tier_detail: string | null;
    payment_status: "pending_payment" | "paid" | null;
    payment_amount_cents: number | null;
    receipt_number: string | null;
    paid_at: string | null;
  };
  const gate = gateState(pay.tier_expires_at);
  const pricingFlags = s as {
    group_lesson_affiliate: boolean;
    extra_lesson_price_override_cents: number | null;
  };

  const [
    wRes,
    pbRes,
    intakeRes,
    progRes,
    objRes,
    tokRes,
    doneRes,
    rRes,
    effRes,
    scoreRowRes,
    videoRes,
    completionsRes,
  ] = await Promise.all([
    supabase
      .from("workouts")
      .select("*")
      .eq("swimmer_id", id)
      .eq("kind", "personal")
      .order("created_at", { ascending: false }),
    supabase
      .from("personal_bests")
      .select("id, distanza_m, stile, vasca, tempo_cc")
      .eq("swimmer_id", id)
      .order("stile", { ascending: true })
      .order("distanza_m", { ascending: true }),
    supabase.from("intake").select("*").eq("user_id", id).maybeSingle(),
    supabase
      .from("programs")
      .select("*")
      .eq("swimmer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("objectives")
      .select("*")
      .eq("swimmer_id", id)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("lesson_tokens")
      .select("*")
      .eq("swimmer_id", id)
      .order("granted_at", { ascending: false }),
    supabase
      .from("activity_events")
      .select("payload")
      .eq("user_id", id)
      .eq("type", "workout.completed"),
    supabase
      .from("v_readiness")
      .select("*")
      .eq("swimmer_id", id)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("v_efficiency_points")
      .select("main_set_sig, rpe, created_at")
      .eq("swimmer_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("glide_scores")
      .select("score, onda")
      .eq("swimmer_id", id)
      .order("week", { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Sprint B — tab Video (nuova qui: prima l'analisi viveva solo su
    // /coach/video, senza vista per-nuotatore).
    supabase
      .from("race_videos")
      .select("*")
      .eq("swimmer_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    // Sprint C.5 (TASK 5) — "Distribuzione carico": lo Svolto reale
    // (workout_completions.blocks, TASK 4), non l'Assegnato.
    supabase
      .from("workout_completions")
      .select("id, week_start, blocks")
      .eq("swimmer_id", id)
      .order("week_start", { ascending: true }),
  ]);

  const workouts = (wRes.data ?? []) as WorkoutRow[];
  const pbs = pbRes.data;
  const intake = intakeRes.data;
  const livello =
    intake && ath?.athlete_type === "libero" ? livelloLibero(intake) : null;
  const hasAthProfile = Boolean(
    ath?.anno_nascita ||
      (ath?.stili_abituali?.length ?? 0) > 0 ||
      (pbs?.length ?? 0) > 0 ||
      intake,
  );

  // Programmazione 1:1: le fasi/note dipendono dai programmi → dopo (unica cascata).
  const progList = (progRes.data ?? []) as ProgramRow[];
  const progIds = progList.map((p) => p.id);
  const [phaseRes, notesRes] = await Promise.all([
    progIds.length
      ? supabase.from("program_phases").select("*").in("program_id", progIds)
      : Promise.resolve({ data: [] as PhaseRow[] }),
    progIds.length
      ? supabase
          .from("program_notes")
          .select("program_id, notes")
          .in("program_id", progIds)
      : Promise.resolve({ data: [] as { program_id: string; notes: string | null }[] }),
  ]);
  const phaseData = phaseRes.data;
  const notesData = notesRes.data;
  const notesByProg = new Map(
    (notesData ?? []).map((n) => [n.program_id as string, n.notes as string | null]),
  );
  const programsFull = progList.map((p) => ({
    ...p,
    phases: ((phaseData ?? []) as PhaseRow[])
      .filter((ph) => ph.program_id === p.id)
      .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    notes: notesByProg.get(p.id) ?? null,
  }));

  // Obiettivi / token / svolti / readiness / efficienza / score:
  // tutti già letti in parallelo sopra (Onda 14.2).
  const objectives = (objRes.data ?? []) as ObjectiveRow[];
  const tokens = (tokRes.data ?? []) as LessonTokenRow[];
  const tokenBalance = availableCount(tokens);

  // Sprint C.5 (TASK 5) — "Distribuzione carico": vista per QUESTO nuotatore
  // (non un aggregato cross-nuotatore), dallo Svolto (workout_completions.blocks).
  const completions = (completionsRes.data ?? []) as WorkoutForStats[];
  const distribuzioneTotale = completions.reduce<Partial<Record<ZonaBucket, number>>>(
    (acc, c) => {
      for (const [z, v] of Object.entries(distribuzioneWorkout(c.blocks ?? [])))
        acc[z as ZonaBucket] = (acc[z as ZonaBucket] ?? 0) + (v ?? 0);
      return acc;
    },
    {},
  );
  const fetteCarico = toFette(distribuzioneTotale);
  const settimaneCarico = buildSettimane(completions);

  const doneCount: Record<string, number> = {};
  (doneRes.data ?? []).forEach((e) => {
    const wid = (e.payload as { workout_id?: string } | null)?.workout_id;
    if (wid) doneCount[wid] = (doneCount[wid] ?? 0) + 1;
  });

  const readiness = (rRes.data ?? []) as VReadinessRow[];
  const effPoints = (effRes.data ?? []) as EffPoint[];

  // Onda 27.1 — feedback/nota post-allenamento (1:1 E Canale Open): la nota
  // era già raccolta al check-in ("una nota per Alessio") ma non arrivava mai
  // in vista al coach. Titolo/fonte dell'allenamento per dare contesto.
  const feedbackRows = readiness
    .filter((r) => r.rpe != null)
    .slice(0, 12);
  const fbWorkoutIds = [
    ...new Set(feedbackRows.map((r) => r.workout_id).filter(Boolean) as string[]),
  ];
  const { data: fbWorkoutsData } = fbWorkoutIds.length
    ? await supabase
        .from("workouts")
        .select("id, title, kind")
        .in("id", fbWorkoutIds)
    : { data: [] as { id: string; title: string; kind: string }[] };
  const workoutById = new Map(
    (fbWorkoutsData ?? []).map((w) => [w.id as string, w]),
  );

  // Riepilogo Open (fase di test): allenamenti svolti + feedback post-sessione.
  const isOpen = swimmer.tier === "open" || swimmer.tier === "open_plus";
  const { data: compData } = isOpen
    ? await supabase
        .from("workout_completions")
        .select("total_meters, completed_at")
        .eq("swimmer_id", id)
        // ADR-012 (Onda 29.5): esclude il self-service dal riepilogo —
        // non è aderenza al programma, resta solo nell'archivio personale.
        .eq("source", "open_channel")
        .order("completed_at", { ascending: false })
        .limit(300)
    : { data: [] as { total_meters: number | null; completed_at: string }[] };
  const svolti = compData ?? [];
  const metriTot = svolti.reduce((n, c) => n + (c.total_meters ?? 0), 0);
  // Feedback post = righe readiness con RPE (l'RPE si dà solo nel post).
  const postRows = readiness.filter((r) => r.rpe != null);
  const nPost = postRows.length;
  const media = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const rpeMedio = media(postRows.map((r) => r.rpe as number));
  const umoreMedio = media(
    postRows.filter((r) => r.umore_post != null).map((r) => r.umore_post as number),
  );
  const bucket = (lo: number, hi: number) =>
    postRows.filter((r) => (r.rpe as number) >= lo && (r.rpe as number) <= hi).length;
  const pieData: PieSlice[] = [
    { label: "Facile (1–3)", value: bucket(1, 3), color: "#22C55E" },
    { label: "Medio (4–6)", value: bucket(4, 6), color: "#F59E0B" },
    { label: "Duro (7–10)", value: bucket(7, 10), color: "#0E5EAB" },
  ];
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat("it-IT", {
      timeZone: "Europe/Rome",
      day: "2-digit",
      month: "short",
    }).format(new Date(iso));
  const lastScore = scoreRowRes.data;
  const score = await computeScore(
    supabase,
    id,
    lastScore?.score ?? null,
    lastScore?.onda ?? null,
  );
  const identity = await computeIdentity(supabase, id);

  // Tab Video (Sprint B): commenti + URL firmati dei file già caricati.
  const videos = (videoRes.data ?? []) as VideoRow[];
  const videoIds = videos.map((v) => v.id);
  const { data: vcData } = videoIds.length
    ? await supabase.from("video_comments").select("*").in("video_id", videoIds)
    : { data: [] as VideoCommentRow[] };
  const videoComments = (vcData ?? []) as VideoCommentRow[];
  const videoPaths = videos.filter((v) => v.storage_path).map((v) => v.storage_path!);
  const signedVideos = videoPaths.length
    ? (await supabase.storage.from("race-videos").createSignedUrls(videoPaths, 3600))
        .data ?? []
    : [];
  const videoUrlByPath = new Map(signedVideos.map((sv) => [sv.path, sv.signedUrl]));

  // Panoramica (Sprint B, mockup): ultimo check-in con fisica/mentale — le
  // due righe restano SEPARATE, mai una media unica (B.5/ADR-013).
  const lastReadiness = readiness.find((r) => r.readiness_fisica != null);

  const renderVideoCard = (v: VideoRow) => {
    const url = v.storage_path ? videoUrlByPath.get(v.storage_path) : undefined;
    const vc = videoComments.filter((c) => c.video_id === v.id);
    return (
      <Card key={v.id} className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">{v.event}</p>
            <p className="text-sm text-muted">
              {v.tier === "coaching_1_1" ? "1:1 · inclusa" : "Open"}
              {v.race_date ? ` · ${v.race_date}` : ""}
            </p>
          </div>
          <Pill tone={v.status === "reviewed" ? "ok" : v.status === "pending" ? "brand" : "warn"}>
            {VIDEO_STATUS_LABEL[v.status]}
          </Pill>
        </div>

        {v.status === "locked" ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-500/5 p-3">
            <p className="text-sm text-muted">
              Analisi bloccata (Open · €5) — sblocca dopo aver incassato.
            </p>
            <form action={unlockPaidVideo}>
              <input type="hidden" name="video_id" value={v.id} />
              <button
                type="submit"
                className="whitespace-nowrap rounded-lg bg-blu px-3 py-1.5 text-sm font-bold text-white"
              >
                Segna incassato
              </button>
            </form>
          </div>
        ) : url ? (
          <video controls src={url} className="w-full rounded-xl bg-black" />
        ) : (
          <p className="text-sm text-muted">File non disponibile.</p>
        )}

        {vc.length > 0 && (
          <div className="flex flex-col gap-1 rounded-xl bg-background p-3">
            {vc.map((c) => (
              <p key={c.id} className="text-sm text-foreground">
                {c.body}
              </p>
            ))}
          </div>
        )}

        {v.status !== "locked" && (
          <div className="flex flex-col gap-2">
            <CommentForm videoId={v.id} />
            {v.status !== "reviewed" && (
              <form action={markReviewed}>
                <input type="hidden" name="video_id" value={v.id} />
                <button
                  type="submit"
                  className="text-sm text-muted underline hover:text-foreground"
                >
                  Segna come analizzato senza commento
                </button>
              </form>
            )}
          </div>
        )}

        <VideoActions
          videoId={v.id}
          hasAnalysis={vc.length > 0}
          birraPaid={v.paid && v.tier === "open"}
          preserved={v.retention_state === "preserved"}
        />
      </Card>
    );
  };

  const headerAlerts: { text: string; tone: "warn" | "bad" | "brand" }[] = [];
  if (pay.payment_status === "pending_payment")
    headerAlerts.push({ text: "Richiesta di attivazione in attesa", tone: "brand" });
  else if (gate === "overdue")
    headerAlerts.push({ text: `Pagamento scaduto da ${daysOverdue(pay.tier_expires_at)}gg`, tone: "bad" });
  else if (gate === "grace")
    headerAlerts.push({ text: `Pagamento in grazia — ${daysOverdue(pay.tier_expires_at)}gg`, tone: "warn" });

  const header = (
    <div className="pb-3 pt-4">
      <Link
        href="/coach/nuotatori"
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} /> Nuotatori
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar text={initials(swimmer)} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl text-foreground">
            {fullName(swimmer)}
          </h1>
          <p className="truncate text-sm text-muted">
            {SERVICE_LABEL[swimmer.service_type]}
            {swimmer.email ? ` · ${swimmer.email}` : ""}
          </p>
        </div>
        <Pill tone="brand">{TIER_LABEL[swimmer.tier]}</Pill>
        <Pill tone={swimmer.status === "attivo" ? "ok" : swimmer.status === "in_pausa" ? "warn" : "neutral"}>
          {STATUS_LABEL[swimmer.status as SwimmerStatus]}
        </Pill>
        {swimmer.package && <Pill tone="brand">{swimmer.package}</Pill>}
      </div>
      {headerAlerts.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {headerAlerts.map((a) => (
            <Pill key={a.text} tone={a.tone}>
              {a.text}
            </Pill>
          ))}
        </div>
      )}
    </div>
  );

  const panels: Record<SwimmerTabKey, React.ReactNode> = {
    panoramica: (
      <div className="flex flex-col gap-6">
        {lastReadiness && (
          <Card className="flex flex-col gap-2">
            <h3 className="t-label text-muted">Ultimo check-in readiness</h3>
            <div className="flex gap-6">
              <div className="flex-1">
                <p className="text-sm text-muted">Fisica</p>
                <p className="font-display text-2xl text-foreground">
                  {lastReadiness.readiness_fisica?.toFixed(1)}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted">Mentale</p>
                <p className="font-display text-2xl text-foreground">
                  {lastReadiness.readiness_mentale?.toFixed(1)}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted">
              Fisica e mentale restano separate — nessuna media unica.
            </p>
          </Card>
        )}

        {isOpen && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg text-foreground">Riepilogo Open</h2>
              <Pill tone="brand">test</Pill>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Card className="flex flex-col items-center py-3">
                <span className="font-display text-2xl text-foreground">{svolti.length}</span>
                <span className="text-sm text-muted">allenamenti svolti</span>
              </Card>
              <Card className="flex flex-col items-center py-3">
                <span className="font-display text-2xl text-foreground">
                  {metriTot.toLocaleString("it-IT")}
                </span>
                <span className="text-sm text-muted">metri totali</span>
              </Card>
              <Card className="flex flex-col items-center py-3">
                <span className="font-display text-2xl text-foreground">{nPost}</span>
                <span className="text-sm text-muted">feedback post</span>
              </Card>
            </div>
            <Card className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-foreground">Come sono andate le sedute</p>
              <OpenRecapPie data={pieData} />
              {nPost > 0 && (
                <p className="text-center text-sm text-muted">
                  RPE medio {rpeMedio.toFixed(1)}/10 · umore post {umoreMedio.toFixed(1)}/5
                </p>
              )}
            </Card>
          </section>
        )}

        {/* PROMPT_CODE_PAGAMENTI TASK 6 (01/09/2026): "tipologia abbonamento"
            solo per 1:1 Elite — allenamenti/sett + cadenza check-in + canale,
            da requested_tier_detail (migration_044, "solo display"). */}
        {swimmer.tier === "one_to_one" && pay.requested_tier_detail && (
          <Card className="flex flex-col gap-1">
            <h2 className="font-display text-lg text-foreground">Tipologia abbonamento</h2>
            <p className="text-sm text-foreground">{pay.requested_tier_detail}</p>
          </Card>
        )}

        <Card>
          <h2 className="mb-4 font-display text-lg text-foreground">Scheda atleta</h2>
          <EditSwimmerForm s={swimmer} />
        </Card>

        {hasAthProfile && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg text-foreground">Profilo</h2>
              {ath?.athlete_type && (
                <Pill tone="brand">{ATHLETE_LABEL[ath.athlete_type as "agonista" | "libero"]}</Pill>
              )}
              {livello && <Pill tone="brand">Livello {livello}</Pill>}
            </div>
            <Card className="flex flex-col gap-2 text-sm">
              {intake?.goal_primary && (
                <div className="flex justify-between">
                  <span className="text-muted">Obiettivo</span>
                  <span className="font-semibold text-foreground">
                    {OBIETTIVO_LABEL[intake.goal_primary as keyof typeof OBIETTIVO_LABEL] ??
                      intake.goal_primary}
                  </span>
                </div>
              )}
              {intake?.freq_settimanale && (
                <div className="flex justify-between">
                  <span className="text-muted">Frequenza / vasca</span>
                  <span className="font-semibold text-foreground">
                    {intake.freq_settimanale}×/sett · {intake.vasca} m
                  </span>
                </div>
              )}
              {ath?.categoria && (
                <div className="flex justify-between">
                  <span className="text-muted">Categoria</span>
                  <span className="font-semibold text-foreground">
                    {ath.categoria}
                    {ath?.anno_nascita ? ` · ${ath.anno_nascita}` : ""}
                  </span>
                </div>
              )}
              {(ath?.stili_abituali?.length ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Stili</span>
                  <span className="font-semibold text-foreground">
                    {ath!.stili_abituali.map((s: string) => STILE_LABEL[s as Stile] ?? s).join(", ")}
                  </span>
                </div>
              )}
              {(ath?.distanze_abituali?.length ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted">Distanze</span>
                  <span className="font-semibold text-foreground">
                    {ath!.distanze_abituali
                      .map((d: string) => (d === "Fondo" ? "Fondo" : `${d} m`))
                      .join(", ")}
                  </span>
                </div>
              )}
            </Card>
          </section>
        )}
      </div>
    ),

    programmazione: (
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Programmazione</h2>
          <ProgramManager swimmerId={id} programs={programsFull} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Nuova scheda personale</h2>
          <Card>
            <WorkoutEditor
              action={savePersonalWorkout}
              context="personal"
              swimmerId={swimmer.id}
              submitLabel="Salva scheda personale"
              successHref="#schede"
            />
          </Card>
        </section>

        {workouts.length > 0 && (
          <section id="schede" className="flex flex-col gap-3">
            <h2 className="font-display text-lg text-foreground">Schede ({workouts.length})</h2>
            {workouts.map((w) => (
              <CoachWorkoutCard key={w.id} w={w} doneCount={doneCount[w.id] ?? 0} />
            ))}
          </section>
        )}
      </div>
    ),

    andamento: (
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Progressi</h2>
          <IdentityCard identity={identity} />
          <OndaCard onda={score.onda} />
          <GlideScoreCard result={score} showBreakdown />
          <ReadinessProgress rows={readiness} />
          <EfficiencyCurves points={effPoints} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Distribuzione carico</h2>
          {completions.length === 0 ? (
            <Card className="text-muted">Nessun allenamento svolto ancora.</Card>
          ) : (
            <Card className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
              <Torta fette={fetteCarico} />
              <div className="w-full sm:flex-1">
                <CurvaCarico settimane={settimaneCarico} />
              </div>
            </Card>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Feedback post-allenamento</h2>
          {feedbackRows.length === 0 ? (
            <Card className="text-muted">Ancora nessun feedback post-sessione.</Card>
          ) : (
            <div className="flex flex-col gap-2">
              {feedbackRows.map((r) => {
                const wo = r.workout_id ? workoutById.get(r.workout_id) : undefined;
                return (
                  <Card key={r.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">
                        {fmtDate(r.created_at)}
                        {wo
                          ? ` · ${
                              wo.kind === "open_channel"
                                ? "Open"
                                : wo.kind === "self"
                                  ? "Suo (self-service)"
                                  : "Scheda"
                            } · ${wo.title}`
                          : ""}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        RPE {r.rpe}/10
                        {r.umore_post != null ? ` · umore ${r.umore_post}/5` : ""}
                      </span>
                    </div>
                    {r.nota && (
                      <p className="rounded-lg bg-background px-3 py-2 text-sm text-foreground">
                        “{r.nota}”
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    ),

    video: (
      <div className="flex flex-col gap-4">
        {videos.length === 0 ? (
          <Card className="text-muted">Nessun video caricato da questo atleta.</Card>
        ) : (
          videos.map(renderVideoCard)
        )}
      </div>
    ),

    obiettivi: (
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Obiettivi</h2>
          {objectives.length === 0 ? (
            <Card className="text-muted">Nessun obiettivo indicato dall&apos;atleta.</Card>
          ) : (
            <div className="flex flex-col gap-2">
              {objectives.map((o: ObjectiveRow) => (
                <Card key={o.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{o.title}</p>
                    <p className="text-sm text-muted">
                      {OBJECTIVE_KIND_LABEL[o.kind]}
                      {o.target_date ? ` · entro ${o.target_date}` : ""}
                    </p>
                  </div>
                  <Pill tone={o.status === "raggiunto" ? "ok" : o.status === "attivo" ? "brand" : "warn"}>
                    {OBJECTIVE_STATUS_LABEL[o.status]}
                  </Pill>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Personal best</h2>
          {(pbs?.length ?? 0) === 0 ? (
            <Card className="text-muted">Nessun tempo registrato ancora.</Card>
          ) : (
            <Card className="flex flex-col gap-1">
              {pbs!.map((pb) => (
                <div key={pb.id} className="flex justify-between text-sm">
                  <span className="text-muted">
                    {pb.distanza_m} {pb.stile} · vasca {pb.vasca}
                  </span>
                  <span className="font-semibold text-foreground">{formatTempo(pb.tempo_cc)}</span>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    ),

    pagamenti: (
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Stato abbonamento</h2>
          <PaymentPanel
            swimmerId={id}
            gate={gate}
            daysOverdue={daysOverdue(pay.tier_expires_at)}
            tierExpiresAt={pay.tier_expires_at}
            requestedTier={pay.requested_tier}
            requestedTierDetail={pay.requested_tier_detail}
            paymentStatus={pay.payment_status}
            paymentAmountCents={pay.payment_amount_cents}
            receiptNumber={pay.receipt_number}
            paidAt={pay.paid_at}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Token lezione</h2>
          <Card className="flex flex-col gap-3">
            <p className="text-sm text-foreground">
              Disponibili: <span className="font-semibold">{tokenBalance}</span>
              <span className="text-muted"> · 1 lezione inclusa a token</span>
            </p>
            <GiftToken swimmerId={id} />
          </Card>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">Prezzi per questo nuotatore</h2>
          <Card>
            <PricingPanel
              swimmerId={id}
              groupLessonAffiliate={pricingFlags.group_lesson_affiliate}
              extraLessonPriceOverrideCents={pricingFlags.extra_lesson_price_override_cents}
            />
          </Card>
        </section>
      </div>
    ),

    note: (
      <div className="flex flex-col gap-3">
        <Card className="text-muted">
          Le note legate a un programma si scrivono nella tab{" "}
          <span className="font-semibold text-foreground">Programmazione</span>,
          dentro il piano attivo. Una nota libera indipendente dal programma
          non è ancora una funzione di GLIDE — segnalato, non inventato qui.
        </Card>
      </div>
    ),
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <SwimmerTabs
        header={header}
        panels={panels}
        // PROMPT_CODE_PAGAMENTI TASK 6 (01/09/2026): "Programmazione" (schede
        // personali di allenamento) non è prevista per open/open_plus/free.
        hiddenTabs={swimmer.tier !== "one_to_one" ? (["programmazione"] as const) : []}
      />
      <div className="flex flex-col gap-6 pb-8 pt-1">
        <form action={archiveSwimmer} className="pt-2">
          <input type="hidden" name="id" value={swimmer.id} />
          <button
            type="submit"
            className="text-sm text-muted underline hover:text-[#DC2626]"
          >
            Archivia nuotatore (imposta “scaduto”)
          </button>
        </form>
      </div>
    </div>
  );
}
