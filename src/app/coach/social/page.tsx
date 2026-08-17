import { createClient } from "@/lib/supabase/server";
import { Card, Pill } from "@/components/ui/card";
import { NewPost } from "./new-post";
import { setPostStatus } from "./actions";
import {
  POST_TYPES,
  STATUS_LABEL,
  pillarLabel,
  type SocialPostRow,
  type PostStatus,
} from "@/lib/social";
import type { LibraryKind } from "@/lib/library";
import { FEEDBACK_TOPICS } from "@/lib/feedback";
import { currentMonday } from "@/lib/week";
import { ContentInsights } from "@/components/social/content-insights";

export const metadata = { title: "Social" };

const NEXT_STATUS: Record<PostStatus, PostStatus | null> = {
  draft: "scheduled",
  scheduled: "published",
  published: null,
};

export default async function SocialPage() {
  const supabase = await createClient();

  const [postsRes, libItemsRes, libOpensRes, focusRes, feedbackRes, swimmerCountRes] =
    await Promise.all([
      supabase.from("social_posts").select("*").order("created_at", { ascending: false }),
      supabase.from("library_items").select("id, title, kind"),
      supabase.from("activity_events").select("payload").eq("type", "library.opened"),
      supabase
        .from("workout_completions")
        .select("focus")
        .eq("source", "open_channel")
        .limit(1000),
      // Onda 28.2 — ultime 8 settimane: abbastanza dati per un trend, non l'intera storia.
      supabase
        .from("weekly_feedback")
        .select("rating, topics, note, week_start, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "swimmer"),
    ]);
  const posts = (postsRes.data ?? []) as SocialPostRow[];

  // Onda 28.2 — "Riepilogo contenuti & idee per i prossimi post": cosa
  // guardano davvero gli atleti (libreria + focus Open) e cosa dicono di
  // volere approfondire (feedback settimanale), in aggregato per il planner.
  const libTitles = new Map(
    (libItemsRes.data ?? []).map((i) => [
      i.id as string,
      { title: i.title as string, kind: i.kind as LibraryKind },
    ]),
  );
  const libOpenCount: Record<string, number> = {};
  (libOpensRes.data ?? []).forEach((e) => {
    const itemId = (e.payload as { item_id?: string } | null)?.item_id;
    if (itemId) libOpenCount[itemId] = (libOpenCount[itemId] ?? 0) + 1;
  });
  const topLibrary = Object.entries(libOpenCount)
    .map(([id, n]) => ({ id, n, ...libTitles.get(id) }))
    .filter((x) => x.title)
    .sort((a, b) => b.n - a.n)
    .slice(0, 6) as { id: string; n: number; title: string; kind: LibraryKind }[];

  const focusCount: Record<string, number> = {};
  (focusRes.data ?? []).forEach((c) => {
    const f = (c.focus as string | null) || "Senza focus";
    focusCount[f] = (focusCount[f] ?? 0) + 1;
  });
  const topFocus = Object.entries(focusCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const feedback = feedbackRes.data ?? [];
  const topicCount: Record<string, number> = {};
  let ratingSum = 0;
  feedback.forEach((f) => {
    ratingSum += (f.rating as number) ?? 0;
    ((f.topics as string[] | null) ?? []).forEach((t) => {
      topicCount[t] = (topicCount[t] ?? 0) + 1;
    });
  });
  const topTopics = FEEDBACK_TOPICS.map((t) => ({
    id: t.id,
    label: t.label,
    n: topicCount[t.id] ?? 0,
  }))
    .filter((t) => t.n > 0)
    .sort((a, b) => b.n - a.n);
  const avgRating = feedback.length ? ratingSum / feedback.length : null;
  const swimmerCount = swimmerCountRes.count ?? 0;
  const currentWeekResponses = feedback.filter(
    (f) => f.week_start === currentMonday(),
  ).length;
  const notes = feedback.filter((f) => f.note).slice(0, 5) as {
    rating: number;
    note: string;
    week_start: string;
  }[];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-foreground">Social</h1>
          <p className="text-sm text-muted">
            Planner del feed · pilastri e regole di pubblicazione.
          </p>
        </div>
        <NewPost />
      </header>

      <ContentInsights
        topLibrary={topLibrary}
        topFocus={topFocus}
        topTopics={topTopics}
        avgRating={avgRating}
        responses={feedback.length}
        currentWeekResponses={currentWeekResponses}
        swimmerCount={swimmerCount}
        notes={notes}
      />

      {posts.length === 0 ? (
        <Card className="text-muted">
          Planner vuoto. Aggiungi il primo post per pianificare il feed.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => {
            const t = p.post_type ? POST_TYPES[p.post_type] : null;
            const next = NEXT_STATUS[p.status];
            return (
              <Card key={p.id} className="flex flex-col gap-3">
                <div
                  className="grid aspect-square place-items-center rounded-xl text-center"
                  style={{
                    background: t?.bg ?? "var(--background)",
                    color: t?.color ?? "var(--muted)",
                  }}
                >
                  <span className="px-4 font-display text-sm">
                    {pillarLabel(p.pillar)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {t && (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ background: t.bg, color: t.color }}
                    >
                      {t.label}
                    </span>
                  )}
                  <Pill
                    tone={
                      p.status === "published"
                        ? "ok"
                        : p.status === "scheduled"
                          ? "brand"
                          : "neutral"
                    }
                  >
                    {STATUS_LABEL[p.status]}
                  </Pill>
                </div>
                <p className="line-clamp-3 text-sm text-foreground">
                  {p.caption}
                </p>
                {p.scheduled_at && (
                  <p className="text-xs text-muted">
                    {new Date(p.scheduled_at).toLocaleString("it-IT", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                {next && (
                  <form action={setPostStatus}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="status" value={next} />
                    <button
                      type="submit"
                      className="text-sm font-semibold text-blu hover:underline"
                    >
                      → {STATUS_LABEL[next]}
                    </button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
