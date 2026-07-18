import type { Metadata } from "next";
import Link from "next/link";
import { WaveLogo } from "@/components/brand/wave-logo";
import { createClient } from "@/lib/supabase/server";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Nuova password" };

export default async function ResetPasswordPage() {
  // Il callback ha già scambiato il code per una sessione di recupero.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="splash-bg flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-4 text-center">
        <WaveLogo height={60} plate={false} />
        <h1 className="font-display text-xl text-white dark:text-foreground">
          Scegli una nuova password
        </h1>
      </div>

      {user ? (
        <ResetForm />
      ) : (
        <div className="w-full max-w-sm text-center">
          <p className="text-[#ffd0d0]">
            Il link di ripristino è scaduto o non è valido.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 inline-block rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-3 font-semibold text-white shadow-lg shadow-black/20"
          >
            Richiedi un nuovo reset
          </Link>
        </div>
      )}
    </main>
  );
}
