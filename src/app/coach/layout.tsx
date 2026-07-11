import { requireRole } from "@/lib/auth";
import { CoachSidebar } from "@/components/shell/coach-sidebar";

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("coach");
  const name =
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    profile.email ||
    "Coach";

  return (
    <div className="flex min-h-dvh bg-background">
      <CoachSidebar name={name} />
      <main className="flex-1 overflow-x-hidden px-8 py-8">{children}</main>
    </div>
  );
}
