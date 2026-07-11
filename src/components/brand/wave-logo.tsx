import { cn } from "@/lib/utils";

/**
 * Logo GLIDE — onde concentriche.
 * Anelli che si propagano (l'onda che parte e si espande),
 * nei colori del brand. `size` in px, `withWordmark` mostra "GLIDE".
 */
export function WaveLogo({
  size = 48,
  withWordmark = false,
  className,
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label="GLIDE"
        fill="none"
      >
        {/* onde concentriche: dall'esterno (blu) al centro (turchese) */}
        <circle cx="50" cy="50" r="46" stroke="var(--navy)" strokeWidth="4" opacity="0.35" />
        <circle cx="50" cy="50" r="34" stroke="var(--blu)" strokeWidth="4" opacity="0.55" />
        <circle cx="50" cy="50" r="22" stroke="var(--teal)" strokeWidth="4" opacity="0.8" />
        <circle cx="50" cy="50" r="9" fill="var(--turchese)" />
      </svg>
      {withWordmark && (
        <span
          className="font-display text-2xl font-semibold tracking-[0.18em] text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          GLIDE
        </span>
      )}
    </span>
  );
}
