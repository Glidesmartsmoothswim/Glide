import { notFound } from "next/navigation";
import { Placeholder } from "@/components/shell/placeholder";
import { serverFeatures } from "@/lib/flags";

// Sezioni coach (rispecchiano la sidebar del prototipo).
const SECTIONS: Record<
  string,
  { title: string; subtitle: string; needs?: "stripe" | "resend" }
> = {
  nuotatori: {
    title: "Nuotatori",
    subtitle: "Anagrafica atleti, servizio attivo, certificati e stato.",
  },
  lead: {
    title: "Lead",
    subtitle: "Richieste in ingresso da convertire in nuotatori.",
    needs: "resend",
  },
  open: {
    title: "Canale Open",
    subtitle: "Allenamenti pubblicati a tutti gli iscritti Open.",
  },
  video: {
    title: "Video gare",
    subtitle: "Coda dei video da analizzare e commenti tecnici.",
  },
  social: {
    title: "Social",
    subtitle: "Pianificazione dei contenuti e del feed Instagram.",
  },
  business: {
    title: "Business",
    subtitle: "Ricavi, abbonamenti e transazioni.",
    needs: "stripe",
  },
  notifiche: {
    title: "Notifiche",
    subtitle: "Avvisi verso i nuotatori.",
    needs: "resend",
  },
  chat: {
    title: "Chat",
    subtitle: "Conversazioni con i tuoi atleti.",
  },
};

export default async function CoachSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const meta = SECTIONS[section];
  if (!meta) notFound();

  const flags = serverFeatures();
  const simulated =
    (meta.needs === "stripe" && !flags.stripe) ||
    (meta.needs === "resend" && !flags.resend);

  return (
    <Placeholder
      title={meta.title}
      subtitle={meta.subtitle}
      simulated={simulated}
    />
  );
}
