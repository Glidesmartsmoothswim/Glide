# STATO — GLIDE

> PWA coaching nuoto Master · Next.js 16 (App Router) + TS + Supabase + Stripe.
> Documento di stato: aggiornato **alla fine di ogni sprint**, così le sessioni
> future ripartono da qui.

_Ultimo aggiornamento: 2026-07-11 — fine Sprint 0._

## Riferimenti nel repo
- `reference/glide-suite.jsx` — prototipo UI da portare fedelmente (coach desktop + nuotatore mobile). **Gitignored.**
- `reference/glide-schema.sql` — schema Supabase.
- `.env.local` — variabili d'ambiente (gitignored, mai committato).

## ✅ Fatto (Sprint 0 — impalcatura)
- Scaffold Next.js 16 (App Router, TS, Tailwind v4, ESLint, `src/`).
- Brand: palette ufficiale (ink/turchese/navy/blu/teal) + font Oswald/Montserrat; logo onde concentriche (`WaveLogo`).
- PWA installabile: `manifest.webmanifest`, icone 192/512/maskable/apple, service worker + registrazione.
- Supabase: client browser + server (`@supabase/ssr`) + middleware refresh sessione.
- Auth: login email+password (server actions) + gating ruoli → `profiles.role` instrada coach → `/coach`, swimmer → `/app`.
- Shell brand: sidebar coach + bottom-tab nuotatore (nav rispecchia il prototipo). Pagine **placeholder**.
- Feature flag (`lib/flags.ts`): senza chiavi Stripe/Resend la funzione resta "simulata", nessun crash.
- `.claude/settings.json` (permessi) + `STATO.md`.

## 🗄️ Schema Supabase — DEPLOYATO
Tutte le tabelle esistono (verificato via REST, 200): `profiles`, `workouts`,
`readiness`, `race_videos`, `video_comments`, `subscriptions`, `transactions`,
`leads`, `messages`, `social_posts`, `notifications`. RLS attiva; trigger
`handle_new_user` crea il profilo al signup.

## 🔑 Env (solo presenza, nessun valore)
- **Presenti:** `NEXT_PUBLIC_APP_URL/NAME`, Supabase URL+anon+service, Stripe publishable+secret, `EMAIL_FROM`.
- **Placeholder:** `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` (Open/Open Water/Elite/Birra), `RESEND_API_KEY`.

## ❌ Manca (da portare dal prototipo)
- **UI reale** (ora ci sono solo placeholder): dashboard coach, elenco nuotatori/lead, **editor allenamenti Zone/Franceschi**, Canale Open, video gare + commenti, chat, business, social; lato nuotatore: Oggi/Nuoto/Video/Progressi/Profilo con dati veri.
- **Persistenza**: lettura/scrittura su Supabase (finora nessuna query applicativa).
- **Pagamenti**: checkout Stripe + webhook (mancano webhook secret e Price ID).
- **Email**: Resend (chiave placeholder).

## ▶️ Prossimo passo
Sprint 1 — inizio dal cuore del prototipo: **editor allenamenti (Zone/Franceschi)
+ Canale Open** con persistenza su `workouts` e RLS (coach scrive, swimmer legge).

## Log sprint
- **Sprint 0** — impalcatura completa. Commit `e42a908` (+ `19134ab` settings). Build verde, login+gating validati in locale.
