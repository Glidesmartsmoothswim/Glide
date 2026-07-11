"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Waves,
  Video,
  TrendingUp,
  User,
  type LucideIcon,
} from "lucide-react";

type Tab = { href: string; label: string; icon: LucideIcon };

// Rispecchia la bottom-tab del prototipo glide-suite.jsx
const TABS: Tab[] = [
  { href: "/app", label: "Oggi", icon: Home },
  { href: "/app/nuoto", label: "Nuoto", icon: Waves },
  { href: "/app/video", label: "Video", icon: Video },
  { href: "/app/progressi", label: "Progressi", icon: TrendingUp },
  { href: "/app/profilo", label: "Profilo", icon: User },
];

export function SwimmerTabbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-w-md items-stretch border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/app" ? pathname === "/app" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${
              active ? "text-blu" : "text-muted"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
