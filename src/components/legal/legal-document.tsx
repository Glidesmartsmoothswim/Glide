import Link from "next/link";
import { WaveLogo } from "@/components/brand/wave-logo";
import { LegalFooter } from "./legal-footer";

/**
 * Guscio comune per /termini e /privacy: pagine statiche, testo legale
 * copiato 1:1 dal documento sorgente (docs/legal/). Nessuna logica, nessuna
 * scrittura DB — solo markup.
 */
export function LegalDocument({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-10 px-6 py-12">
      <Link href="/" className="self-start">
        <WaveLogo height={32} />
      </Link>

      <article className="flex flex-col gap-8">
        <h1 className="font-display text-3xl font-bold text-navy dark:text-foreground">
          {title}
        </h1>
        {children}
      </article>

      <LegalFooter className="mt-4 text-muted" />
    </main>
  );
}

export function LegalTable({
  head,
  rows,
}: {
  head: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <thead>
          <tr className="bg-background">
            {head.map((h) => (
              <th
                key={h}
                className="border-b border-border px-3 py-2 text-left font-bold text-navy dark:text-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="odd:bg-surface even:bg-background/60">
              {row.map((cell, j) => (
                <td key={j} className="border-b border-border px-3 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LegalSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-bold text-navy dark:text-foreground">
        {number}. {title}
      </h2>
      <div className="flex flex-col gap-3 text-base leading-relaxed text-foreground">
        {children}
      </div>
    </section>
  );
}
