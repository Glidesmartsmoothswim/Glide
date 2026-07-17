"use client";

import Link from "next/link";
import { useState } from "react";
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
  ClipboardList,
  LogOut,
  Menu,
  X,
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
      { href: "/coach/videoanalisi", label: "Videoanalisi", icon: ClipboardList },
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

/**
 * Sidebar coach. Desktop (≥lg): colonna fissa come prima.
 * Mobile: topbar con hamburger + drawer a scomparsa — ogni tap su un link
 * chiude il drawer, così l'app si usa in verticale.
 */
export function CoachSidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* Topbar solo mobile */}
      <header className="fixed inset-x-0 top-0 z-40 flex items-center gap-3 bg-ink px-4 py-3 text-white lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Apri il menu"
          className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10"
        >
          <Menu size={20} />
        </button>
        <WaveLogo size={22} />
        <span className="font-display text-base tracking-[0.18em]">GLIDE</span>
      </header>

      {/* Sfondo scuro dietro il drawer aperto */}
      {open && (
        <button
          aria-label="Chiudi il menu"
          onClick={close}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 z-50 flex h-dvh w-[248px] flex-col bg-ink text-white transition-transform duration-200 lg:sticky lg:z-auto lg:w-[232px] lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-5">
          <WaveLogo size={28} />
          <span className="font-display text-lg tracking-[0.18em]">GLIDE</span>
          <button
            onClick={close}
            aria-label="Chiudi il menu"
            className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 lg:hidden"
          >
            <X size={18} />
          </button>
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
                    onClick={close}
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
    </>
  );
}
