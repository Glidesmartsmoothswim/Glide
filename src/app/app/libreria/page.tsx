import Link from "next/link";
import { BookOpen, FileText, Video as VideoIcon, LinkIcon, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { librarySignedUrls } from "@/lib/storage";
import { KIND_LABEL, type LibraryItem, type LibraryKind } from "@/lib/library";
import {
  canOpenLibraryItem,
  upgradeTargetFor,
  TIER_LABEL,
  type Visibility,
} from "@/lib/access";

export const metadata = { title: "Libreria" };

const KIND_ICON: Record<LibraryKind, typeof FileText> = {
  pdf: FileText,
  video: VideoIcon,
  link: LinkIcon,
};

export default async function SwimmerLibreria() {
  const profile = await getCurrentProfile();
  const tier = profile?.tier ?? "free";
  const supabase = await createClient();

  const { data } = await supabase
    .from("library_items")
    .select("*")
    .eq("published", true)
    .order("sort", { ascending: true })
    .order("created_at", { ascending: false });
  const items = (data ?? []) as LibraryItem[];

  const covers = await librarySignedUrls(
    items.map((i) => i.cover_key).filter(Boolean) as string[],
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl text-foreground">Libreria</h1>
        <p className="text-sm text-muted">
          Ebook, booklet e materiale di consultazione.
        </p>
      </header>

      {items.length === 0 ? (
        <Card className="text-muted">
          Ancora nessun contenuto. Torna presto.
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((i) => {
            const Icon = KIND_ICON[i.kind];
            const cover = i.cover_key ? covers.get(i.cover_key) : undefined;
            const unlocked = canOpenLibraryItem(
              tier,
              i.visibility as Visibility,
            );
            const target = upgradeTargetFor(i.visibility as Visibility);

            const inner = (
              <Card className="flex h-full flex-col gap-2 p-3">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-background">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt=""
                      className={`h-full w-full object-cover ${
                        unlocked ? "" : "opacity-40"
                      }`}
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted">
                      <Icon size={28} />
                    </div>
                  )}
                  {!unlocked && (
                    <div className="absolute inset-0 grid place-items-center bg-navy/25">
                      <Lock size={22} className="text-white" />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blu">
                  <Icon size={12} /> {KIND_LABEL[i.kind]}
                </div>
                <p className="text-sm font-semibold leading-snug text-foreground">
                  {i.title}
                </p>
                {i.description && (
                  <p className="line-clamp-2 text-xs text-muted">
                    {i.description}
                  </p>
                )}
                {!unlocked && target && (
                  <p className="mt-auto text-[11px] text-muted">
                    Con il piano {TIER_LABEL[target]}
                  </p>
                )}
              </Card>
            );

            return unlocked ? (
              <Link
                key={i.id}
                href={`/app/libreria/${i.id}/open`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {inner}
              </Link>
            ) : (
              <Link key={i.id} href="/app/profilo" className="block">
                {inner}
              </Link>
            );
          })}
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-muted">
        <BookOpen size={14} /> I contenuti bloccati si sbloccano con il piano
        indicato.
      </p>
    </div>
  );
}
