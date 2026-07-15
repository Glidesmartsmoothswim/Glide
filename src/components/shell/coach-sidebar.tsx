"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Radio,
  Video,
  Share2,
  BarChart3,
  Bell,
  MessageCircle,
  CalendarClock,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { WaveLogo } from "@/components/brand/wave-logo";
import { signOut } from "@/app/login/actions";

type Item = { href: string; label: string; icon: LucideIcon };
type Group = { title: string; items: Item[] };

// Rispecchia la sidebar del prototipo glide-suite.jsx
const NAV: Group[] = [
  {
    title: "Panoramica",
    items: [{ href: "/coach", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Nuotatori",
    items: [
      { href: "/coach/nuotatori", label: "Nuotatori", icon: Users },
      { href: "/coach/lead", label: "Lead", icon: UserPlus },
    ],
  },
  {
    title: "Allenamento",
    items: [
      { href: "/coach/open", label: "Canale Open", icon: Radio },
      { href: "/coach/agenda", label: "Agenda", icon: CalendarClock },
    ],
  },
  {
    title: "Contenuti",
    items: [
      { href: "/coach/video", label: "Video gare", icon: Video },
      { href: "/coach/social", label: "Social", icon: Share2 },
    ],
  },
  {
    title: "Business",
    items: [{ href: "/coach/business", label: "Business", icon: BarChart3 }],
  },
  {
    title: "Comunicazione",
    items: [
      { href: "/coach/notifiche", label: "Notifiche", icon: Bell },
      { href: "/coach/chat", label: "Chat", icon: MessageCircle },
    ],
  },
];

export function CoachSidebar({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-dvh w-[232px] flex-col bg-ink text-white">
      <div className="flex items-center gap-2 px-5 py-5">
        <WaveLogo size={28} />
        <span className="font-display text-lg tracking-[0.18em]">GLIDE</span>
      </div>

      <nav className="flex-1 overflow-y-auto pb-3">
        {NAV.map((group) => (
          <div key={group.title} className="mb-1">
            <div className="px-5 pb-1 pt-3 text-[10px] uppercase tracking-[0.15em] text-white/30">
              {group.title}
            </div>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/coach"
                  ? pathname === "/coach"
                  : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative mx-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    active
                      ? "bg-turchese/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {active && (
                    <span className="absolute left-1 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-turchese" />
                  )}
                  <Icon size={17} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-blu to-navy text-xs font-bold">
          {name.slice(0, 2).toUpperCase()}
        </span>
        <span className="flex-1 truncate text-sm text-white/80">{name}</span>
        <form action={signOut}>
          <button
            type="submit"
            title="Esci"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/5 hover:text-white"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </aside>
  );
}
