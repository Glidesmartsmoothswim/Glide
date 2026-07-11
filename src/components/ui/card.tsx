import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-5 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Avatar({ text }: { text: string }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blu to-navy text-sm font-bold text-white">
      {text}
    </span>
  );
}

const TONES = {
  ok: "border-teal/30 bg-teal/10 text-teal",
  warn: "border-amber-500/40 bg-amber-500/10 text-[#B45309]",
  bad: "border-red-500/30 bg-red-500/10 text-[#DC2626]",
  neutral: "border-border bg-background text-muted",
  brand: "border-blu/30 bg-blu/10 text-blu",
} as const;

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
