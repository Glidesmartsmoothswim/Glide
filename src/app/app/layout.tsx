import { requireRole } from "@/lib/auth";
import { SwimmerTabbar } from "@/components/shell/swimmer-tabbar";
import { AssistantWidget } from "@/components/assistant/assistant-widget";

export default async function SwimmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("swimmer");

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background">
      <main className="flex-1 px-5 pb-24 pt-6">{children}</main>
      <AssistantWidget />
      <SwimmerTabbar />
    </div>
  );
}
