import { cn } from "@/lib/utils";

/**
 * Logo GLIDE — lockup ufficiale (mark a onde + wordmark "GLIDE").
 * L'immagine è disegnata per fondo scuro (wordmark chiaro): di default la
 * appoggiamo su una placca navy arrotondata (come lo sfondo dell'icona app)
 * così resta leggibile anche in light mode. Dove lo sfondo è già scuro
 * (es. sidebar `bg-ink`) usare `plate={false}`.
 *
 * `height` in px controlla l'altezza; la larghezza segue l'aspetto (~1.75:1).
 */
export function WaveLogo({
  height = 40,
  plate = true,
  className,
}: {
  height?: number;
  plate?: boolean;
  className?: string;
}) {
  const img = (
    // Asset raster del brand: next/image non serve (dimensione fissa, nessuna
    // ottimizzazione utile). Il wordmark è nell'immagine stessa.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo-mark.png"
      alt="GLIDE"
      style={{ height, width: "auto", display: "block" }}
    />
  );

  if (!plate) {
    return <span className={cn("inline-flex", className)}>{img}</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl bg-navy px-3 py-2",
        className,
      )}
    >
      {img}
    </span>
  );
}
