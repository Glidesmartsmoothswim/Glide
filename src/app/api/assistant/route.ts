import { getCurrentProfile } from "@/lib/auth";
import { fullName } from "@/lib/types";
import { handleMessage } from "@/lib/assistant/router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/assistant { message }
 * Safety router deterministico PRIMA di qualsiasi modello (ADR-004).
 * Risposta: solo testo (ADR-001) — mai payload che il client possa scrivere.
 */
export async function POST(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return new Response("unauthorized", { status: 401 });

  const body = await req.json().catch(() => ({}));
  const message = String(body.message ?? "").trim();
  if (!message) return Response.json({ error: "messaggio vuoto" }, { status: 400 });
  if (message.length > 2000)
    return Response.json({ error: "messaggio troppo lungo" }, { status: 413 });

  const reply = await handleMessage(fullName(profile), message);
  return Response.json(reply);
}
