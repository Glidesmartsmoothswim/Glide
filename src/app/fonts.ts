import localFont from "next/font/local";

/**
 * GLIDE — tipografia web (ADR-009 / GLIDE_TIPOGRAFIA.md).
 * UNA famiglia, DUE pesi: Glacial Indifference 400 e 700 (+ italic 400).
 * woff2 auto-ospitati in /public/fonts. Niente CDN.
 * La gerarchia si fa con dimensione, MAIUSCOLO+tracking e colore — non col peso.
 * `font-synthesis: none` (in globals.css) vieta grassetti/corsivi finti.
 */
export const glacial = localFont({
  src: [
    {
      path: "../../public/fonts/GlacialIndifference-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/GlacialIndifference-Italic.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/GlacialIndifference-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-glide",
  display: "swap",
  fallback: ["Avenir Next", "Century Gothic", "system-ui", "sans-serif"],
  adjustFontFallback: false,
});
