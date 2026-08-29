import { Check } from "lucide-react";
import { markRead, markAllRead } from "@/app/notifiche-actions";
import { NOTIF_EMOJI, type NotificationRow } from "@/lib/notifications";
import { shortDate } from "@/lib/readiness";

function NotifRow({ n }: { n: NotificationRow }) {
  return (
    <li
      className={`flex items-start gap-3 rounded-2xl border p-4 ${
        n.read ? "border-border bg-surface" : "border-blu/30 bg-blu/5"
      }`}
    >
      <span className="text-xl">{n.type ? NOTIF_EMOJI[n.type] : "🔔"}</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-foreground">{n.title}</p>
        {n.body && <p className="text-sm text-muted">{n.body}</p>}
        <p className="mt-0.5 text-sm text-muted">{shortDate(n.created_at)}</p>
      </div>
      {!n.read && (
        <form action={markRead}>
          <input type="hidden" name="id" value={n.id} />
          <button
            type="submit"
            title="Segna letta"
            className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-background hover:text-foreground"
          >
            <Check size={16} />
          </button>
        </form>
      )}
    </li>
  );
}

export function NotifList({
  rows,
  showMarkAll = true,
}: {
  rows: NotificationRow[];
  showMarkAll?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
        Nessuna notifica.
      </p>
    );
  }

  // Feedback 29/08: le lette non sparivano mai — restavano in cima alla
  // lista home insieme alle nuove. Il campo `read` c'era già, mancava solo
  // il filtro qui: in evidenza solo le non lette, le lette collassate sotto
  // (mai perse, solo fuori dai piedi).
  const unreadRows = rows.filter((r) => !r.read);
  const readRows = rows.filter((r) => r.read);

  return (
    <div className="flex flex-col gap-3">
      {showMarkAll && unreadRows.length > 0 && (
        <form action={markAllRead} className="self-end">
          <button
            type="submit"
            className="text-sm font-bold text-blu hover:underline"
          >
            Segna tutte come lette ({unreadRows.length})
          </button>
        </form>
      )}
      {unreadRows.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {unreadRows.map((n) => (
            <NotifRow key={n.id} n={n} />
          ))}
        </ul>
      ) : (
        readRows.length === 0 && (
          <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
            Nessuna notifica non letta.
          </p>
        )
      )}
      {readRows.length > 0 && (
        <details className="text-sm text-muted">
          <summary className="cursor-pointer select-none font-bold hover:text-foreground">
            {readRows.length} già {readRows.length === 1 ? "letta" : "lette"}
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {readRows.map((n) => (
              <NotifRow key={n.id} n={n} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
