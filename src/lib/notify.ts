import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverFeatures } from "@/lib/flags";
import { getResend, emailFrom } from "@/lib/resend";

export type NotifType =
  | "open"
  | "cert"
  | "video"
  | "birra"
  | "retention"
  | "pay"
  | "plan"
  | "booking"
  | "richiesta";

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

/**
 * Email a tutti i coach (feedback 29/08 — TASK 4: oggi il coach deve
 * controllare a mano in agenda quando arriva una prenotazione). Stesso
 * pattern "silenzioso" di requestActivation: se Resend non è configurata o
 * l'invio fallisce, non lancia — la notifica in-app resta comunque la
 * fonte di verità primaria.
 */
export async function notifyCoachesEmail(subject: string, html: string) {
  if (!serverFeatures().resend) return;
  const admin = createAdminClient();
  if (!admin) return;
  const resend = getResend();
  if (!resend) return;
  const { data } = await admin
    .from("profiles")
    .select("email")
    .eq("role", "coach")
    .not("email", "is", null);
  const emails = (data ?? [])
    .map((c: { email: string | null }) => c.email)
    .filter((e): e is string => Boolean(e));
  await Promise.all(
    emails.map((to) =>
      resend.emails.send({ from: emailFrom(), to, subject, html }).catch(() => null),
    ),
  );
}
