import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Link a Termini/Privacy — usato in fondo alle pagine pubbliche (login) e
 * nelle pagine legali stesse per rimandare l'una all'altra.
 */
export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-sm",
        className,
      )}
    >
      <span>© {new Date().getFullYear()} GLIDE — Alessio Coppola</span>
      <Link href="/termini" className="underline underline-offset-2">
        Termini e Condizioni
      </Link>
      <Link href="/privacy" className="underline underline-offset-2">
        Privacy
      </Link>
    </footer>
  );
}
