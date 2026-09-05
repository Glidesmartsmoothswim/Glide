import type { NextConfig } from "next";

/**
 * Security headers (S-2, ADR-006 A-7).
 * - Header "duri" ENFORCED: non rompono nulla (HSTS, nosniff, frame-options,
 *   referrer, permissions).
 * - CSP in REPORT-ONLY: raccoglie le violazioni senza bloccare. Da
 *   promuovere a enforcing dopo verifica.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "media-src 'self' blob: https://*.supabase.co",
  "font-src 'self' data:",
  // Next inietta stili/script inline: senza nonce serve 'unsafe-inline'.
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  // Nessun frame-src: senza la direttiva vale default-src 'self'. I domini
  // Stripe erano l'unico motivo per cui esisteva (ADR-014, ora rimossa).
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
