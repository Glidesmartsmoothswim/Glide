import { createAdminClient } from "@/lib/supabase/admin";
import { purgeExpiredVideos } from "@/lib/retention";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Purge video — cron giornaliero (vedi vercel.json). Protetto da CRON_SECRET.
 * Rimuove i file dei video soft-deleted da >7gg, archiviati da >90gg e i
 * fallback Open >365gg; la riga resta come tombstone (commenti preservati).
 */
export async function POST(req: Request) {
  return run(req);
}
export async function GET(req: Request) {
  return run(req);
}

async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return new Response("no admin", { status: 200 });

  const purged = await purgeExpiredVideos(admin);
  return Response.json({ purged });
}
