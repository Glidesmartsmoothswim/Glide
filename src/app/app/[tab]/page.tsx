import { notFound } from "next/navigation";
import { Placeholder } from "@/components/shell/placeholder";
import { serverFeatures } from "@/lib/flags";

// Tab del nuotatore (rispecchiano la bottom-tab del prototipo).
const TABS: Record<
  string,
  { title: string; subtitle: string; needs?: "stripe" | "resend" }
> = {
  nuoto: {
    title: "Nuoto",
    subtitle: "I tuoi allenamenti: canale Open e schede personali.",
  },
  video: {
    title: "Video",
    subtitle:
      "Carica i tuoi video gara e ricevi l'analisi tecnica del coach.",
    needs: "stripe",
  },
  progressi: {
    title: "Progressi",
    subtitle: "Andamento nel tempo: volumi, tempi e prontezza.",
  },
  profilo: {
    title: "Profilo",
    subtitle: "Dati, abbonamento e certificato medico.",
  },
};

export default async function SwimmerTab({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  const meta = TABS[tab];
  if (!meta) notFound();

  const flags = serverFeatures();
  const simulated = meta.needs === "stripe" && !flags.stripe;

  return (
    <Placeholder
      title={meta.title}
      subtitle={meta.subtitle}
      simulated={simulated}
    />
  );
}
