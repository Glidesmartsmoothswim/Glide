# PROJECT — GLIDE

**In una frase.** Piattaforma di coaching per nuotatori Master adulti (agonisti e libero) che amplifica il coach invece di sostituirlo.

**Obiettivo di business.** Trasformare il coaching individuale di Alessio in un prodotto scalabile: coaching personale, Canale Open in abbonamento, rete coach certificati, e — a lungo termine — dati longitudinali sul nuoto Master.

**Chi lo usa.**
- **Coach** (oggi: Alessio) — programma, osserva, conferisce badge, decide il carico.
- **Nuotatore Master 40–60** — segue il programma, registra readiness, carica video, riceve restituzione.

**Stack.** Next.js (App Router, TypeScript) · Supabase (Postgres + Auth + Storage + RLS) · Stripe · Resend (`glideswim.it`) · Cloudflare R2 · Vercel.

**Metodo.** Zone di allenamento di Franceschi (famiglie: Over, Fartlek, Rainbow, Autoallenante, Tolleranza — mai etichette Z1–Z5) · microcicli tecnici di Rushall · distinzione capacità/potenza di Olbrecht · CSS via modello CS/D′.

**Cosa NON è.**
- Non è un'app di training generico: non genera allenamenti in autonomia.
- L'AI **legge e segnala**, non prescrive: *l'AI adatta l'esperienza, il coach adatta il carico* (ADR-001).
- Non è open-water-romantic: il registro è la vasca. Tagline: *vasca dopo vasca*.
- Non gestisce dati di pagamento carta (delegati a Stripe: fuori perimetro PCI).

**Compliance AIOS.** Level 1. Titolare del trattamento: Alessio (persona fisica/P.IVA).
