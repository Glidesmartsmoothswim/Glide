import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

/** Rotte accessibili senza login (incl. webhook/API che gestiscono l'auth da sé). */
const PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/api",
  "/offline",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * Aggiorna la sessione Supabase a ogni richiesta e protegge le rotte:
 * - utente non loggato su rotta privata → /login
 * - utente loggato che apre /login       → / (poi instradato per ruolo)
 *
 * NB: il gating per RUOLO (coach vs swimmer) avviene nei layout di sezione,
 * per non fare una query al DB a ogni richiesta nel middleware.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Onda 15: verifica del token LOCALE (getClaims) invece di getUser(), che
  // fa una chiamata di rete al server Auth a OGNI navigazione. Con le chiavi
  // di firma ASIMMETRICHE la verifica è locale (nessun round-trip); su chiavi
  // legacy HS256 getClaims ripiega su getUser (nessuna regressione). Il refresh
  // della sessione resta gestito (getClaims usa getSession internamente).
  const { data: claimsData } = await supabase.auth.getClaims();
  const isLogged = Boolean(claimsData?.claims?.sub);

  const { pathname } = request.nextUrl;

  if (!isLogged && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isLogged && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
