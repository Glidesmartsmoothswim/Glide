import type { Metadata } from "next";
import { WaveLogo } from "@/components/brand/wave-logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Accedi" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <WaveLogo height={60} />
        <p className="text-sm text-muted">Coaching di nuoto Master</p>
      </div>
      <LoginForm />
    </main>
  );
}
