# GLIDE

> onda dopo onda

Piattaforma di coaching per il nuoto: programmazione degli allenamenti,
analisi video e abbonamenti. Monorepo dell'applicazione web **glide.swim**.

## Stack

| Ambito      | Tecnologia                          |
| ----------- | ----------------------------------- |
| Framework   | Next.js 16 (App Router) + React 19  |
| Linguaggio  | TypeScript                          |
| Stile       | Tailwind CSS v4                     |
| Database/Auth | Supabase (Postgres + RLS)         |
| Pagamenti   | Stripe (abbonamenti + una tantum)   |
| Email       | Resend                              |
| Validazione | Zod                                 |

## Requisiti

- Node.js ≥ 20 (sviluppato su v24)
- Un progetto Supabase, un account Stripe (modalità test) e un account Resend

## Avvio in locale

```bash
# 1. Installa le dipendenze
npm install

# 2. Configura le variabili d'ambiente
cp .env.local.example .env.local
#    → incolla i valori veri dalle dashboard (istruzioni dentro il file)

# 3. Avvia il dev server
npm run dev
```

App su http://localhost:3000

## Script

| Comando         | Descrizione                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Server di sviluppo (Turbopack)       |
| `npm run build` | Build di produzione                  |
| `npm run start` | Avvia la build di produzione         |
| `npm run lint`  | ESLint                               |

## Struttura

```
src/
  app/                 # route (App Router), layout, landing
    fonts.ts           # font locali del brand (next/font/local)
    globals.css        # design token GLIDE (colori, tipografia)
  fonts/               # file .otf ufficiali
  lib/
    env.ts             # validazione env (public vs server) con Zod
    supabase/          # client browser + server (@supabase/ssr)
    stripe.ts          # istanza Stripe + mappa dei Price ID
    resend.ts          # client email
public/
  brand/               # loghi ufficiali
```

## Variabili d'ambiente

Tutte documentate in [`.env.local.example`](.env.local.example).
Regola: le variabili `NEXT_PUBLIC_*` finiscono nel browser (non segrete);
tutte le altre restano solo lato server. `.env.local` non va mai committato.

## Abbonamenti

| Piano       | Prezzo        |
| ----------- | ------------- |
| Open        | € 29 / mese   |
| Open Water  | € 79 / mese   |
| Elite 1:1   | € 129 / mese  |
| "Offrimi una birra" | € 5 una tantum (analisi video Open) |

---

**Sprint 0** — fondamenta del progetto: scaffolding, design system del brand,
client dei servizi e landing placeholder.
