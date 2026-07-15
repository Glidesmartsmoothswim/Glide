import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotifType =
  | "open"
  | "cert"
  | "video"
  | "birra"
  | "retention"
  | "pay"
  | "plan"
  | "booking";

/**
 * Crea una notifica per un utente. Usa la service_role perché la tabella
 * `notifications` non ha policy di insert lato utente. No-op se non
 * configurata (nessun crash).
 */
export async function notifyUser(
  userId: string,
  type: NotifType,
  title: string,
  body?: string,
) {
  const admin = createAdminClient();
  if (!admin) return;
  await admin
    .from("notifications")
    .insert({ user_id: userId, type, title, body: body ?? null });
}

/** Notifica tutti i coach (per eventi provenienti dai nuotatori). */
export async function notifyCoaches(
  type: NotifType,
  title: string,
  body?: string,
) {
  const admin = createAdminClient();
  if (!admin) return;
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "coach");
  const rows = (data ?? []).map((c: { id: string }) => ({
    user_id: c.id,
    type,
    title,
    body: body ?? null,
  }));
  if (rows.length) await admin.from("notifications").insert(rows);
}
