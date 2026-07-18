import type { Metadata } from "next";
import { WaveLogo } from "@/components/brand/wave-logo";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Password dimenticata" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="splash-bg flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <WaveLogo height={60} plate={false} />
        <div>
          <h1 className="font-display text-xl text-white dark:text-foreground">
            Reimposta la password
          </h1>
          <p className="mt-1 text-sm text-[#c7d4ee] dark:text-muted">
            Ti mandiamo un link via email
          </p>
        </div>
      </div>
      <ForgotForm linkError={sp.error === "link"} />
    </main>
  );
}
