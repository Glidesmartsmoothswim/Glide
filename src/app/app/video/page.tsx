import { Beer, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { clientFeatures } from "@/lib/flags";
import { Card, Pill } from "@/components/ui/card";
import { VideoUploader } from "@/components/video/uploader";
import { unlockVideo } from "./actions";
import { VideoActions, UndoDelete } from "./video-actions";
import { STATUS_LABEL, type VideoRow, type VideoCommentRow } from "@/lib/video";

export const metadata = { title: "Video" };

export default async function SwimmerVideo() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: vData } = await supabase
    .from("race_videos")
    .select("*")
    .eq("swimmer_id", profile?.id ?? "")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  const videos = (vData ?? []) as VideoRow[];

  // Soft-deleted entro la finestra: consultabili solo per "Annulla".
  const { data: delData } = await supabase
    .from("race_videos")
    .select("id, event, deleted_at")
    .eq("swimmer_id", profile?.id ?? "")
    .not("deleted_at", "is", null)
    .is("purged_at", null)
    .order("deleted_at", { ascending: false });
  const deleted = (delData ?? []) as {
    id: string;
    event: string;
    deleted_at: string;
  }[];

  const { data: cData } = await supabase
    .from("video_comments")
    .select("*")
    .in("video_id", videos.map((v) => v.id).length ? videos.map((v) => v.id) : [""]);
  const comments = (cData ?? []) as VideoCommentRow[];

  // URL firmati per i video sbloccati (RLS: solo i propri file).
  const paths = videos
    .filter((v) => v.storage_path && v.status !== "locked")
    .map((v) => v.storage_path!);
  const signed = paths.length
    ? (await supabase.storage.from("race-videos").createSignedUrls(paths, 3600))
        .data ?? []
    : [];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl text-foreground">Video gare</h1>
        <p className="text-sm text-muted">
          Carica una gara e ricevi l&apos;analisi tecnica del coach.
        </p>
      </header>

      <Card>
        <h2 className="mb-3 font-display text-lg text-foreground">Nuovo video</h2>
        <VideoUploader />
      </Card>

      <section className="flex flex-col gap-4">
        {videos.length === 0 && (
          <Card className="text-muted">Ancora nessun video caricato.</Card>
        )}
        {videos.map((v) => {
          const url = v.storage_path
            ? urlByPath.get(v.storage_path)
            : undefined;
          const vc = comments.filter((c) => c.video_id === v.id);
          return (
            <Card key={v.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">{v.event}</h3>
                  <p className="text-xs text-muted">
                    {v.tier === "coaching_1_1" ? "1:1 · inclusa" : "Open"}
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

              {v.status === "locked" ? (
                <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Lock size={16} /> Analisi bloccata — offri una birra per
                    sbloccarla.
                  </div>
                  <form action={unlockVideo}>
                    <input type="hidden" name="video_id" value={v.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#F59E0B] px-4 py-2.5 font-semibold text-white"
                    >
                      <Beer size={16} /> Paga €5 e sblocca
                      {!clientFeatures.stripe && (
                        <span className="ml-1 rounded bg-white/20 px-1.5 text-xs">
                          simulato
                        </span>
                      )}
                    </button>
                  </form>
                </div>
              ) : url ? (
                <video
                  controls
                  src={url}
                  className="w-full rounded-xl bg-black"
                />
              ) : null}

              {vc.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl bg-background p-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-blu">
                    Analisi del coach
                  </span>
                  {vc.map((c) => (
                    <p key={c.id} className="text-sm text-foreground">
                      {c.body}
                    </p>
                  ))}
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
        })}
      </section>

      {deleted.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-lg text-foreground">
            Eliminati di recente
          </h2>
          {deleted.map((d) => (
            <Card key={d.id} className="flex flex-col gap-1">
              <span className="font-semibold text-foreground">{d.event}</span>
              <UndoDelete videoId={d.id} />
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
