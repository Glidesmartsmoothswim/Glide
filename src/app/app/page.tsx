import { getCurrentProfile } from "@/lib/auth";
import { WaveLogo } from "@/components/brand/wave-logo";
import { Placeholder } from "@/components/shell/placeholder";

export default async function SwimmerToday() {
  const profile = await getCurrentProfile();
  const name = profile?.first_name || "nuotatore";

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Ciao {name},</p>
          <h1 className="font-display text-2xl text-foreground">Oggi</h1>
        </div>
        <WaveLogo size={36} />
      </header>
      <Placeholder
        title="La tua giornata"
        subtitle="Allenamento del giorno, prontezza e prossimi impegni. Onda dopo onda."
      />
    </div>
  );
}
