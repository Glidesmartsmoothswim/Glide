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

export const metadata = { title: "Social" };

const NEXT_STATUS: Record<PostStatus, PostStatus | null> = {
  draft: "scheduled",
  scheduled: "published",
  published: null,
};

export default async function SocialPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("social_posts")
    .select("*")
    .order("created_at", { ascending: false });
  const posts = (data ?? []) as SocialPostRow[];

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
