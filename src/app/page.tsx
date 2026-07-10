import Image from "next/image";

const plans = [
  {
    name: "Open",
    price: "€29",
    tagline: "Il canale per iniziare a nuotare meglio.",
    accent: "border-border",
  },
  {
    name: "Open Water",
    price: "€79",
    tagline: "Programmazione e analisi video ricorrente.",
    accent: "border-wave",
    featured: true,
  },
  {
    name: "Elite 1:1",
    price: "€129",
    tagline: "Coaching individuale, seguito onda dopo onda.",
    accent: "border-gold",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-16 px-6 py-24">
      <header className="flex flex-col items-center gap-6 text-center">
        <Image
          src="/brand/logo.svg"
          alt="GLIDE"
          width={200}
          height={80}
          priority
          className="h-auto w-48"
        />
        <p className="font-display text-xl tracking-wide text-muted">
          onda dopo onda
        </p>
        <h1 className="max-w-2xl font-display text-4xl leading-tight text-foreground sm:text-5xl">
          Coaching di nuoto e analisi video,
          <span className="text-wave"> dal primo tuffo all&apos;élite.</span>
        </h1>
      </header>

      <section className="grid w-full max-w-4xl gap-5 sm:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col gap-3 rounded-2xl border-2 bg-background/60 p-6 ${plan.accent} ${
              plan.featured ? "shadow-lg" : ""
            }`}
          >
            <h2 className="font-display text-lg text-foreground">{plan.name}</h2>
            <p className="text-3xl font-semibold text-foreground">
              {plan.price}
              <span className="text-base font-normal text-muted"> / mese</span>
            </p>
            <p className="text-sm text-muted">{plan.tagline}</p>
          </div>
        ))}
      </section>

      <footer className="text-center text-sm text-muted">
        Sprint 0 · fondamenta del progetto ·{" "}
        <span className="font-brand">GLIDE</span>
      </footer>
    </main>
  );
}
