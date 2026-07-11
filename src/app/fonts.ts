import { Oswald, Montserrat } from "next/font/google";

/**
 * Font ufficiali GLIDE.
 * - Oswald     → titoli / display (condensato, deciso)
 * - Montserrat → UI / corpo del testo
 */

export const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
  display: "swap",
});

export const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});
