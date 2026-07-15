import { createAdminClient } from "@/lib/supabase/admin";
import { computeDigest } from "@/lib/digest";
import { getResend, emailFrom } from "@/lib/resend";
import { serverFeatures } from "@/lib/flags";

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
  // Protezione cron: se CRON_SECRET è impostato, Vercel manda l'header.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return new Response("no admin", { status: 200 });

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

  const html = `
    <div style="font-family:Arial,sans-serif;color:#0B1220">
      <h2 style="color:#0E5EAB">GLIDE — il tuo lunedì</h2>
      ${sections
        .map(
          (s) => `
        <h3 style="text-transform:uppercase;letter-spacing:.09em;font-size:14px;color:#4b5a68">${s.title}</h3>
        ${
          s.rows.length
            ? `<ul>${s.rows.map((r) => `<li style="margin:6px 0">${r.text}</li>`).join("")}</ul>`
            : `<p style="color:#4b5a68">—</p>`
        }`,
        )
        .join("")}
      <p style="color:#4b5a68;font-size:13px">Osservazioni, non prescrizioni. Il carico resta tuo.</p>
    </div>`;

  const { error } = await resend!.emails.send({
    from: emailFrom(),
    to,
    subject: "GLIDE — il tuo lunedì",
    html,
  });
  return Response.json({ sent: !error, total, error: error?.message ?? null });
}
