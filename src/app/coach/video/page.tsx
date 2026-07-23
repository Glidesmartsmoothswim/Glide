import { Video as VideoIcon, Archive as ArchiveIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Avatar, Pill } from "@/components/ui/card";
import { CommentForm } from "./comment-form";
import { markReviewed } from "./actions";
import { VideoActions } from "@/app/app/video/video-actions";
import { STATUS_LABEL, type VideoRow, type VideoCommentRow } from "@/lib/video";
import { daysToPurge } from "@/lib/retention";
import { fullName, initials, type SwimmerRow } from "@/lib/types";

export const metadata = { title: "Video gare" };

const order = { pending: 0, locked: 1, reviewed: 2 } as const;

export default async function CoachVideo() {
  const supabase = await createClient();

  const { data: vData } = await supabase
    .from("race_videos")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  const videos = (vData ?? []) as VideoRow[];

  const swIds = [...new Set(videos.map((v) => v.swimmer_id))];
  const { data: pData } = swIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .in("id", swIds)
    : { data: [] };
  const byId = new Map(
    ((pData ?? []) as Partial<SwimmerRow>[]).map((p) => [p.id, p]),
  );

  const { data: cData } = await supabase
    .from("video_comments")
    .select("*")
    .in("video_id", videos.map((v) => v.id).length ? videos.map((v) => v.id) : [""]);
  const comments = (cData ?? []) as VideoCommentRow[];

  const paths = videos.filter((v) => v.storage_path).map((v) => v.storage_path!);
  const signed = paths.length
    ? (await supabase.storage.from("race-videos").createSignedUrls(paths, 3600))
        .data ?? []
    : [];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));

  // Onda 24: coda = solo i video DA analizzare (in attesa o da sbloccare).
  // I video già commentati (analizzati) e quelli archiviati col macrociclo
  // escono dalla coda e finiscono nella sezione a scomparsa "Analizzati".
  const toReview = videos.filter(
    (v) => v.retention_state !== "archived" && v.status !== "reviewed",
  );
  const done = videos
    .filter(
      (v) => v.retention_state === "archived" || v.status === "reviewed",
    )
    .sort(
      (a, b) =>
        new Date(b.archived_at ?? b.created_at ?? 0).getTime() -
        new Date(a.archived_at ?? a.created_at ?? 0).getTime(),
    );
  const sorted = [...toReview].sort((a, b) => order[a.status] - order[b.status]);
  const pending = toReview.filter((v) => v.status === "pending").length;

  const renderCard = (v: VideoRow) => {
    const sw = byId.get(v.swimmer_id);
    const url = v.storage_path ? urlByPath.get(v.storage_path) : undefined;
    const vc = comments.filter((c) => c.video_id === v.id);
    const purgeIn = v.retention_state === "archived" ? daysToPurge(v.archived_at) : null;
    return (
      <Card key={v.id} className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar text={sw ? initials(sw as SwimmerRow) : "?"} />
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              {sw ? fullName(sw as SwimmerRow) : "Atleta"}
            </p>
            <p className="text-xs text-muted">
              {v.event}
              {v.race_date ? ` · ${v.race_date}` : ""}
            </p>
          </div>
          <Pill
            tone={
              v.status === "reviewed"
                ? "ok"
                : v.status === "pending"
                  ? "brand"
                  : "warn"
            }
          >
            {STATUS_LABEL[v.status]}
          </Pill>
        </div>

        {purgeIn != null && (
          <p className="rounded-xl bg-background p-3 text-xs text-muted">
            Archiviato con la chiusura del programma ·{" "}
            {purgeIn > 0
              ? `rimozione tra ${purgeIn} giorni`
              : "in rimozione a breve"}
            . Il nuotatore può preservarlo ✦ per non perderlo.
          </p>
        )}

        {v.status === "locked" ? (
          <p className="rounded-xl bg-amber-500/5 p-3 text-sm text-muted">
            In attesa che l&apos;atleta sblocchi l&apos;analisi (Open · €5).
          </p>
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

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blu to-navy text-white">
          <VideoIcon size={20} />
        </span>
        <div>
          <h1 className="font-display text-2xl text-foreground">Video gare</h1>
          <p className="text-sm text-muted">{pending} in coda da analizzare</p>
        </div>
      </header>

      {sorted.length === 0 && done.length === 0 && (
        <Card className="text-muted">Nessun video caricato dagli atleti.</Card>
      )}

      {sorted.length === 0 && done.length > 0 && (
        <Card className="text-muted">
          Nessun video in coda: sono tutti analizzati. Li trovi qui sotto.
        </Card>
      )}

      {sorted.map(renderCard)}

      {done.length > 0 && (
        <details className="flex flex-col gap-3">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-muted">
            <ArchiveIcon size={16} />
            Analizzati · {done.length} video
          </summary>
          <div className="mt-3 flex flex-col gap-6">{done.map(renderCard)}</div>
        </details>
      )}
    </div>
  );
}
