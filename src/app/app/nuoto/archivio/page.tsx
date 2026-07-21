import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { WorkoutCard } from "@/components/workout/workout-card";
import { UpgradeHint } from "@/components/access/upgrade-hint";
import { canAccess } from "@/lib/access";
import { formatWeek, currentMonday } from "@/lib/week";
import type { WorkoutRow } from "@/lib/types";

export const metadata = { title: "Archivio Open" };

/**
 * Archivio storico Canale Open — SOLO open_plus (Onda 12.4). Enforcement lato
 * server: se il tier non è ammesso non interroghiamo nemmeno i dati, mostriamo
 * l'invito. (La RLS di per sé già nasconde le settimane passate agli open.)
 */
export default async function OpenArchive({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; q?: string }>;
}) {
  const profile = await getCurrentProfile();
  const tier = profile?.tier ?? "free";
  const { focus = "", q = "" } = await searchParams;

  if (!canAccess(tier, "open:archive")) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/app/nuoto"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft size={16} /> Nuoto
        </Link>
        <header>
          <h1 className="font-display text-2xl text-foreground">Archivio Open</h1>
          <p className="text-sm text-muted">
            Tutti gli allenamenti del Canale Open, settimana dopo settimana.
          </p>
        </header>
        <UpgradeHint
          target="open_plus"
          message="L'archivio storico completo è incluso in Open+: rivedi e rifai qualunque allenamento passato."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("*")
    .eq("kind", "open_channel")
    .order("week_start", { ascending: false });
  let items = (data ?? []) as WorkoutRow[];

  const focuses = [
    ...new Set(items.map((w) => w.focus).filter(Boolean) as string[]),
  ].sort();

  if (focus) items = items.filter((w) => w.focus === focus);
  if (q.trim()) {
    const needle = q.trim().toLowerCase();
    items = items.filter((w) => w.title.toLowerCase().includes(needle));
  }

  const cur = currentMonday();
  const weeks = [...new Set(items.map((w) => w.week_start ?? ""))];
  const byWeek = weeks.map((wk) => ({
    week: wk,
    isCurrent: wk === cur,
    items: items.filter((w) => (w.week_start ?? "") === wk),
  }));

  const field =
    "rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-blu";

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/app/nuoto"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} /> Nuoto
      </Link>
      <header>
        <h1 className="font-display text-2xl text-foreground">Archivio Open</h1>
        <p className="text-sm text-muted">
          Scegli e rifai qualunque allenamento passato.
        </p>
      </header>

      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
          Cerca
          <span className="flex items-center gap-2 rounded-xl border border-border bg-background px-3">
            <Search size={15} className="text-muted" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Titolo…"
              className="flex-1 bg-transparent py-2 text-sm outline-none"
            />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          Focus
          <select name="focus" defaultValue={focus} className={field}>
            <option value="">Tutti</option>
            {focuses.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white"
        >
          Filtra
        </button>
      </form>

      {byWeek.length === 0 ? (
        <Card className="text-muted">Nessun allenamento trovato.</Card>
      ) : (
        byWeek.map((g) => (
          <section key={g.week || "no-week"} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-muted">
              {g.week ? formatWeek(g.week) : "Senza settimana"}
              {g.isCurrent && (
                <span className="ml-2 rounded bg-turchese/15 px-1.5 py-0.5 text-xs text-teal">
                  corrente
                </span>
              )}
            </h2>
            {g.items.map((w) => (
              <WorkoutCard key={w.id} w={w} />
            ))}
          </section>
        ))
      )}
    </div>
  );
}
