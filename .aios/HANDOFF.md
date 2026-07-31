# Handoff — Gestionale GLIDE · 31 luglio 2026

## Sessione appena chiusa — Onda 27
Richiesta: feedback/note post-allenamento visibili al coach negli 1:1 (e ora, in test, anche per il Canale Open) · statistiche di preferenza sulla selezione degli allenamenti Open · valutare personalizzazione dell'Open in base al livello (pulsanti riduci/aumenta), con base scientifica sulla percentuale.

- **27.1 — Bug chiuso.** La nota libera del check-in post ("una nota per Alessio", colonna `readiness.note`, esiste da `migration_002`) non arrivava **mai** al coach: `v_readiness` non la esponeva, nessuna UI la mostrava. `migration_033_readiness_note_coach.sql` (additiva) espone `note as nota` + `workout_id` in vista. Nuova sezione "Feedback post-allenamento" nella scheda coach — **sempre visibile, non solo Open**: copre 1:1 e Canale Open perché il check-in è lo stesso flusso per entrambi. Testo integrale della nota, RPE, umore, titolo/fonte allenamento.
- **27.2 — Preferenze Canale Open** (`/coach/open`, in aggregato, mai per nome): tasso di scelta per allenamento nella settimana corrente (svolti/iscritti Open), focus più scelti (da `workout_completions`), conteggio personalizzazioni riduci/aumenta.
- **27.3 — Personalizzazione volume Open.** 3 pulsanti su `/app/nuoto/[id]` (solo `open_channel`): Riduci un po' (−15%) · Come indicato · Aumenta un po' (+10%) — si scala SOLO il volume (`rounds` dei blocchi), mai zona/passo/intervallo (altrimenti si snatura lo stimolo prescritto). Percentuali asimmetriche di proposito (più margine a scendere) per prudenza su un canale non supervisionato in tempo reale. Suggerimento non vincolante basato sull'ultimo RPE auto-riportato (≥8 → valuta di ridurre; ≤3 → valuta di aumentare) — **non usa né mostra il `livello` calcolato in intake** (resta solo-coach per ADR-006, di proposito non toccato). Scelta loggata fail-soft (`workout.adjusted`, nuovo `EventType`, nessuna migration perché `activity_events.type` non ha CHECK) → alimenta 27.2.

### File toccati
- Migration: `supabase/migrations/migration_033_readiness_note_coach.sql` (nuova), `migration_001_activity_ledger.sql` (solo commento vocabolario, additivo).
- `src/lib/readiness.ts` (tipo `VReadinessRow` + `nota`/`workout_id`), `src/lib/ledger.ts` (`EventType`), `src/lib/workout.ts` (`scaleBlocks`/`ADJUST_FACTOR`/`AdjustDirection`).
- `src/components/workout/workout-card.tsx` (estratto `BlockList`, riusato), `src/components/workout/workout-adjust.tsx` (nuovo).
- `src/app/app/nuoto/[id]/page.tsx` (wiring personalizzazione + ultimo RPE), `src/app/app/nuoto/adjust-actions.ts` (nuovo, server action ledger).
- `src/app/coach/nuotatori/[id]/page.tsx` (sezione feedback universale), `src/app/coach/open/page.tsx` (sezione Preferenze).
- `STATO.md` (Onda 27), `.aios/HANDOFF.md` (questo file).

### Verifica fatta in sessione
- `npx tsc --noEmit` verde (dopo `npm install`, node_modules non presente nel clone).
- `npm run lint` verde sui file toccati (gli errori residui — `app/page.tsx`, `assistant-widget.tsx`, `home-greeting.tsx` — sono preesistenti, non toccati in questa sessione).
- `next build`: si ferma solo sulle env Supabase mancanti nel sandbox (`NEXT_PUBLIC_*`), nessun errore di codice — stesso pattern già visto in Onda 11/13.
- **Non eseguito** (nessun accesso a un progetto Supabase reale da questo sandbox): applicazione della migration, collaudo a schermo, verifica RLS a runtime.

## Prossimo passo
- **Applicare `migration_033` al deploy** (view, nessun rischio: `create or replace`, non tocca dati).
- **Collaudo umano consigliato:** scrivere una nota da atleta (1:1 e Open) e verificarla in scheda coach; provare i 3 pulsanti di personalizzazione da un account Open; controllare che "Preferenze" su `/coach/open` popoli percentuali sensate con dati reali.
- Resta aperto tutto il binario privacy/GDPR (DPIA, testi consenso) descritto nelle onde precedenti — non toccato qui.

## Blocchi
- Nessun nuovo blocco introdotto da questa sessione.
- Restano i blocchi già noti: `004_consents` su DPIA/consensi (legale); gate umani elencati nelle onde precedenti (MFA coach, leaked-password, backup PITR + restore, env Upstash, CSP enforcing, gitleaks).

## Note di sessione
- Sandbox senza credenziali Supabase/Vercel reali: nessuna query eseguita contro un DB vero, solo lettura di schema/migration dal repo. `git push` da verificare (nota precedente: proxy nativo rotto in sessioni passate, workaround GitHub MCP).
