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
| Pagamenti   | Bonifico SEPA + QR EPC (incasso manuale, ADR-014) |
| Email       | Resend                              |
| Validazione | Zod                                 |
| Tipografia  | Glacial Indifference (locale, SIL OFL 1.1) |

## Requisiti

- Node.js ≥ 20 (sviluppato su v24)
- Un progetto Supabase e un account Resend (Upstash e Anthropic opzionali)

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
    layout.tsx         # font Glacial Indifference, PWA meta, register SW
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
    flags.ts           # feature flag Resend/AI (funzione "simulata")
    auth.ts            # profilo corrente, requireRole, homeForRole
    supabase/          # client browser + server + middleware
    payment/           # listino, richieste, bonifico, QR EPC, stato
    resend.ts          # Resend lazy (null se non configurato)
public/
  sw.js                # service worker minimale
  icons/               # icone PWA (192, 512, maskable, apple)
  fonts/               # Glacial Indifference + OFL.txt (licenza)
supabase/migrations/   # schema Postgres + policy RLS
docs/legal/            # informativa, termini, DPIA, registro trattamenti
```

## Feature flag (nessun crash senza chiavi)

Se mancano le chiavi **Resend** o **Anthropic** (o sono placeholder), la
relativa funzione resta **"simulata"**: l'app parte lo stesso. Vedi
`src/lib/flags.ts`.

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

Listino in `src/lib/payment/pricing.ts` (mensili) e
`src/lib/payment/elite-pricing.ts` (1:1, prezzo composto).

| Piano             | Prezzo             |
| ----------------- | ------------------ |
| Open              | € 9,90 / mese      |
| Open+             | € 12,90 / mese     |
| 1:1 mensile       | € 79 / mese        |
| 1:1 stagionale    | € 690 (10 mesi)    |
| Videoanalisi      | € 100 una tantum   |

L'incasso è **manuale**: il nuotatore riceve gli estremi del bonifico con
QR EPC, il coach segna la richiesta come pagata dal gestionale. Nessun
PSP integrato (ADR-014).

## Licenza

Software **proprietario** — © 2026 Alessio Coppola, tutti i diritti
riservati. Vedi [`LICENSE`](./LICENSE). Componenti di terzi e relative
licenze in [`NOTICE`](./NOTICE).

---

Stato di avanzamento e prossimi passi: [`STATO.md`](./STATO.md).
