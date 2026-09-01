// PROMPT_CODE_APP_UPDATE TASK 1 (01/09/2026) — sha del deploy corrente, per
// far accorgere chi ha già l'app aperta che c'è una versione nuova
// (components/pwa/update-banner.tsx). Vercel inietta VERCEL_GIT_COMMIT_SHA
// automaticamente ad ogni deploy, nessuna configurazione manuale.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ sha: process.env.VERCEL_GIT_COMMIT_SHA || "dev" });
}
