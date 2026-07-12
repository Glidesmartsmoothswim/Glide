import { Check } from "lucide-react";
import { markRead, markAllRead } from "@/app/notifiche-actions";
import { NOTIF_EMOJI, type NotificationRow } from "@/lib/notifications";
import { shortDate } from "@/lib/readiness";

export function NotifList({
  rows,
  showMarkAll = true,
}: {
  rows: NotificationRow[];
  showMarkAll?: boolean;
}) {
  const unread = rows.filter((r) => !r.read).length;

  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted">
        Nessuna notifica.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {showMarkAll && unread > 0 && (
        <form action={markAllRead} className="self-end">
          <button
            type="submit"
            className="text-sm font-semibold text-blu hover:underline"
          >
            Segna tutte come lette ({unread})
          </button>
        </form>
      )}
      <ul className="flex flex-col gap-2">
        {rows.map((n) => (
          <li
            key={n.id}
            className={`flex items-start gap-3 rounded-2xl border p-4 ${
              n.read
                ? "border-border bg-surface"
                : "border-blu/30 bg-blu/5"
            }`}
          >
            <span className="text-xl">
              {n.type ? NOTIF_EMOJI[n.type] : "🔔"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{n.title}</p>
              {n.body && <p className="text-sm text-muted">{n.body}</p>}
              <p className="mt-0.5 text-xs text-muted">
                {shortDate(n.created_at)}
              </p>
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
        ))}
      </ul>
    </div>
  );
}
