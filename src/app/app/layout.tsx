import { requireRole } from "@/lib/auth";
import { SwimmerTabbar } from "@/components/shell/swimmer-tabbar";
import { AssistantWidget } from "@/components/assistant/assistant-widget";
import { ReconsentGate } from "@/components/legal/reconsent-gate";
import { CompleteNameBanner } from "@/components/profile/complete-name-banner";

export default async function SwimmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("swimmer");

  // Gate di re-consenso (GLIDE_CONSENSI.md §6): bloccante, niente altro si
  // monta finché non accetta — evita fetch/side-effect del resto dell'app
  // prima dell'accettazione. Solo swimmer (il coach non passa da qui).
  if (!profile.terms_privacy_accepted_at) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
        <ReconsentGate />
      </div>
    );
  }

  const needsName = !profile.first_name?.trim() || !profile.last_name?.trim();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <main className="flex-1 px-5 pb-24 pt-6">
        {needsName && (
          <CompleteNameBanner
            firstName={profile.first_name}
            lastName={profile.last_name}
          />
        )}
        {children}
      </main>
      <AssistantWidget />
      <SwimmerTabbar />
    </div>
  );
}
