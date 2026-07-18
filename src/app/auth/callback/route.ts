import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback del flusso PKCE Supabase (@supabase/ssr).
 * Il link nell'email di ripristino punta qui con `?code=...`: scambiamo il
 * code per una sessione (di recupero) e reindirizziamo a `next`
 * (di default /reset-password). Su errore → /forgot-password?error=link.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/reset-password";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL("/forgot-password?error=link", url.origin));
}
