import { BookOpen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, Pill } from "@/components/ui/card";
import { librarySignedUrls } from "@/lib/storage";
import { KIND_LABEL, type LibraryItem } from "@/lib/library";
import { TIER_LABEL } from "@/lib/access";
import { LibraryForm } from "./library-form";
import { LibraryRowActions } from "./library-row-actions";

export const metadata = { title: "Libreria" };

export default async function CoachLibreria() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("library_items")
    .select("*")
    .order("sort", { ascending: true })
    .order("created_at", { ascending: false });
  const items = (data ?? []) as LibraryItem[];

  const covers = await librarySignedUrls(
    items.map((i) => i.cover_key).filter(Boolean) as string[],
  );

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blu to-navy text-white">
          <BookOpen size={20} />
        </span>
        <div>
          <h1 className="font-display text-2xl text-foreground">Libreria</h1>
          <p className="text-sm text-muted">
            Materiale di consultazione: ebook, booklet, link. La visibilità
            segue il tier dell&apos;atleta.
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">Nuovo contenuto</h2>
        <Card>
          <LibraryForm />
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">
          Contenuti ({items.length})
        </h2>
        {items.length === 0 ? (
          <Card className="text-muted">Ancora nessun contenuto.</Card>
        ) : (
          items.map((i) => {
            const cover = i.cover_key ? covers.get(i.cover_key) : undefined;
            return (
              <Card key={i.id} className="flex gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-background">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-muted">
                      <BookOpen size={20} />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{i.title}</p>
                    <Pill tone={i.published ? "ok" : "warn"}>
                      {i.published ? "Pubblicato" : "Bozza"}
                    </Pill>
                  </div>
                  {i.description && (
                    <p className="text-sm text-muted">{i.description}</p>
                  )}
                  <p className="text-xs text-muted">
                    {KIND_LABEL[i.kind]} · visibilità {TIER_LABEL[i.visibility]}
                  </p>
                  <div className="mt-1">
                    <LibraryRowActions id={i.id} published={i.published} />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
