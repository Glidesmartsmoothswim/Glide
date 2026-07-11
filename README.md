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

## Ruoli e instradamento

Due ruoli, letti da `profiles.role` su Supabase:

- **coach** → `/coach` — gestionale desktop con **sidebar**.
- **swimmer** → `/app` — PWA mobile con **bottom-tab**.

`/` instrada in base al ruolo; il `middleware` protegge le rotte private
(non loggato → `/login`). Il gating per ruolo è nei layout di sezione.

## Struttura

```
middleware.ts          # refresh sessione + protezione rotte
src/
  app/
    layout.tsx         # font Oswald/Montserrat, PWA meta, register SW
    globals.css        # design token GLIDE (palette + tipografia)
    manifest.ts        # web manifest (/manifest.webmanifest)
    page.tsx           # instrada per ruolo
    login/             # login email (server actions + form)
    coach/             # sezione coach (layout sidebar + pagine)
    app/               # sezione nuotatore (layout bottom-tab + pagine)
  components/
    brand/wave-logo    # logo a onde concentriche
    shell/             # coach-sidebar, swimmer-tabbar, placeholder
    pwa/register-sw    # registrazione service worker
  lib/
    env.ts             # env + helper "configured" (placeholder-safe)
    flags.ts           # feature flag Stripe/Resend (funzione "simulata")
    auth.ts            # profilo corrente, requireRole, homeForRole
    supabase/          # client browser + server + middleware
    stripe.ts          # Stripe lazy (null se non configurato)
    resend.ts          # Resend lazy (null se non configurato)
public/
  sw.js                # service worker minimale
  icons/               # icone PWA (192, 512, maskable, apple)
reference/             # prototipi UI (glide-suite.jsx) — non buildati
```

## Feature flag (nessun crash senza chiavi)

Se mancano le chiavi **Stripe**/**Resend** (o sono placeholder), la relativa
funzione resta **"simulata"**: l'app parte lo stesso. Vedi `src/lib/flags.ts`.

## Test rapido in locale

1. `npm run dev` → apri http://localhost:3000 (verrai mandato a `/login`).
2. In **Registrati** crea un account (nasce come `swimmer` → `/app`).
   - Se il progetto Supabase ha "Confirm email" attivo, conferma via mail;
     per test rapidi puoi disattivarlo in Supabase → Auth → Providers → Email.
3. Per provare il **coach**, promuovi l'utente da Supabase (SQL editor):
   ```sql
   update public.profiles set role = 'coach' where email = 'tua@email';
   ```
   Rientra: verrai instradato su `/coach`.

## Abbonamenti

| Piano       | Prezzo        |
| ----------- | ------------- |
| Open        | € 29 / mese   |
| Open Water  | € 79 / mese   |
| Elite 1:1   | € 129 / mese  |
| "Offrimi una birra" | € 5 una tantum (analisi video Open) |

---

**Sprint 0** — impalcatura: PWA installabile, Supabase (browser+server),
login email + gating ruoli, shell coach/nuotatore, feature flag. Nessuna
funzione applicativa: quelle arrivano dagli sprint successivi.
