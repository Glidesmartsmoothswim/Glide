import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computeDigest } from "@/lib/digest";
import { serverFeatures } from "@/lib/flags";
import { Card, Pill } from "@/components/ui/card";

export const metadata = { title: "Dashboard" };

export default async function CoachDashboard() {
  const supabase = await createClient();
  const sections = await computeDigest(supabase);
  const total = sections.reduce((n, s) => n + s.rows.length, 0);
  const resend = serverFeatures().resend;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-foreground">Dashboard</h1>
          <p className="t-small text-muted">Il tuo digest — chi merita un tuo gesto oggi.</p>
        </div>
        {!resend && <Pill tone="warn">email simulata</Pill>}
      </header>

      {!resend && (
        <Card className="t-small text-muted">
          L&apos;invio email del lunedì è in <b>modalità simulata</b> (manca
          RESEND_API_KEY): il digest lo vedi qui in-app. Nessun crash.
        </Card>
      )}

      {total === 0 ? (
        <Card className="t-body text-muted">
          Tutto tranquillo: nessun segnale da gestire questa settimana.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((s) => (
            <Card key={s.title} className="flex flex-col gap-2">
              <h2 className="t-label text-muted">{s.title}</h2>
              {s.rows.length === 0 ? (
                <p className="t-small text-muted">—</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {s.rows.map((r) => (
                    <li key={r.swimmerId + r.text}>
                      <Link
                        href={`/coach/nuotatori/${r.swimmerId}`}
                        className="block rounded-xl border border-border bg-background p-3 t-small text-foreground hover:border-blu"
                      >
                        {r.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
