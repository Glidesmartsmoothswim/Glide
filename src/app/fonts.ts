import localFont from "next/font/local";

/**
 * Font ufficiali GLIDE (file .otf in src/fonts).
 * Ognuno espone una CSS variable usata da globals.css / Tailwind.
 *
 * adjustFontFallback: false → Turbopack non prova a derivare le metriche
 * di fallback da questi .otf (operazione che fallisce su questi file).
 */

// Corpo del testo
export const glacial = localFont({
  src: "../fonts/glacial-indifference.regular.otf",
  variable: "--font-glacial",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

// Titoli / display
export const franklin = localFont({
  src: "../fonts/ITCFranklinGothicStd-Demi.otf",
  variable: "--font-franklin",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

// Lettering di marca
export const kotex = localFont({
  src: "../fonts/Kotex-Bold.otf",
  variable: "--font-kotex",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Arial", "Helvetica", "sans-serif"],
});
