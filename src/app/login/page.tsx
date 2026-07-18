import type { Metadata } from "next";
import { WaveLogo } from "@/components/brand/wave-logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Accedi" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="splash-bg flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <WaveLogo height={60} plate={false} />
        <p className="text-sm text-[#c7d4ee] dark:text-muted">
          Coaching di nuoto Master
        </p>
      </div>
      <LoginForm justReset={sp.reset === "1"} />
    </main>
  );
}
