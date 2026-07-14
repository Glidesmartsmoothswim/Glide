import type { Metadata, Viewport } from "next";
import { glacial } from "./fonts";
import { RegisterSW } from "@/components/pwa/register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GLIDE — onda dopo onda",
    template: "%s · GLIDE",
  },
  description:
    "GLIDE — coaching di nuoto Master. Allenamenti, analisi video e progressi, onda dopo onda.",
  applicationName: "GLIDE",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GLIDE",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
};

export const viewport: Viewport = {
  themeColor: "#0B1220",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${glacial.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
