import { WaveLogo } from "@/components/brand/wave-logo";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <WaveLogo size={64} />
      <div>
        <h1 className="font-display text-2xl text-foreground">Sei offline</h1>
        <p className="mt-1 max-w-xs text-sm text-muted">
          Nessuna connessione. Le tue schede tornano appena sei di nuovo in
          rete — onda dopo onda.
        </p>
      </div>
    </main>
  );
}
