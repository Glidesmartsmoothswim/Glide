import { createAdminClient } from "@/lib/supabase/admin";
import { computeDigest } from "@/lib/digest";
import { computeAndStore } from "@/lib/score/compute";
import { getResend, emailFrom } from "@/lib/resend";
import { serverFeatures } from "@/lib/flags";
import { publicEnv } from "@/lib/env";
import { cronAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Digest coach — lunedì 07:00 (cron Vercel, vedi vercel.json).
 * Manda l'email al coach via Resend. Se Resend non è configurato: no-op
 * (il digest resta visibile in-app sulla Dashboard). Nessun crash.
 */
export async function POST(req: Request) {
  return run(req);
}
export async function GET(req: Request) {
  return run(req);
}

async function run(req: Request) {
  // Protezione cron (A-2bis): header assente/errato o secret non configurato → 401.
  if (!cronAuthorized(req)) return new Response("unauthorized", { status: 401 });

  const admin = createAdminClient();
  if (!admin) return new Response("no admin", { status: 200 });

  // Onda + Glide Score settimanali per ogni nuotatore (FASE 5).
  const { data: swimmers } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "swimmer");
  for (const s of swimmers ?? []) {
    await computeAndStore(admin, s.id);
  }

  const sections = await computeDigest(admin);
  const total = sections.reduce((n, s) => n + s.rows.length, 0);

  if (!serverFeatures().resend) {
    return Response.json({ sent: false, reason: "resend non configurato", total });
  }

  const resend = getResend();
  const { data: coaches } = await admin
    .from("profiles")
    .select("email")
    .eq("role", "coach");
  const to = (coaches ?? []).map((c) => c.email).filter(Boolean) as string[];
  if (to.length === 0) return Response.json({ sent: false, reason: "nessun coach" });

  // S-3 · regola email "notifica, non contiene": in email vanno SOLO conteggi,
  // mai testo con dati sanitari (nomi + zone di dolore + readiness). I dettagli
  // restano dentro l'app, dove il coach li apre in un contesto protetto.
  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0B1220">
      <h2 style="color:#0E5EAB">GLIDE — il tuo lunedì</h2>
      <p>Ci sono <b>${total}</b> ${total === 1 ? "segnalazione" : "segnalazioni"} da guardare questa settimana.</p>
      <ul>
        ${sections
          .map(
            (s) =>
              `<li style="margin:6px 0">${s.title}: <b>${s.rows.length}</b></li>`,
          )
          .join("")}
      </ul>
      <p><a href="${appUrl}/coach" style="background:#0E5EAB;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Apri GLIDE</a></p>
      <p style="color:#4b5a68;font-size:13px">I dettagli restano nell'app: l'email non contiene dati sensibili. Osservazioni, non prescrizioni — il carico resta tuo.</p>
    </div>`;

  const { error } = await resend!.emails.send({
    from: emailFrom(),
    to,
    subject: `GLIDE — il tuo lunedì · ${total} da guardare`,
    html,
  });
  return Response.json({ sent: !error, total, error: error?.message ?? null });
}
