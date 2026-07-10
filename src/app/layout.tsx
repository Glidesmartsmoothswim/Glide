import type { Metadata } from "next";
import { glacial, franklin, kotex } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GLIDE — onda dopo onda",
    template: "%s · GLIDE",
  },
  description:
    "GLIDE — coaching di nuoto e analisi video. Onda dopo onda, verso il tuo miglior gesto in acqua.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${glacial.variable} ${franklin.variable} ${kotex.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
