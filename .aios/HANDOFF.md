# Handoff — Gestionale GLIDE · 14 agosto 2026

## Sessione appena chiusa — Onda 28
Richiesta: migliorare l'usabilità dell'agenda (registrare fasce orarie e vederle in un elenco dove gli eventi si ripetono è dispersivo) · la parte social dovrebbe contenere un riepilogo dei contenuti visualizzati dagli utenti e indicazioni sui post futuri · introdurre nell'app atleta una domanda settimanale di feedback + cosa vorrebbe approfondire.

- **28.1 — Agenda.** "Finestre attive" raggruppa le regole duplicate su più giorni (stesso orario/passo/modalità/etichetta) in **una riga con 7 chip giorno** invece di N righe identiche. Clic su una chip = rimuove solo quel giorno; "Elimina tutte" = rimuove il gruppo intero. Puro raggruppamento client-side (`lib/availability.ts`), nessuna migration.
- **28.2 — Social.** Nuova sezione "Riepilogo contenuti & idee per i prossimi post" su `/coach/social`: contenuti Libreria più aperti (nuovo tracking `library.opened`), focus Canale Open più scelti (fonte già esistente, 27.2), argomenti più richiesti + umore medio + ultime note dal **feedback settimanale** dell'atleta (nuova tabella `weekly_feedback`, migration_034). L'app atleta propone una card non invasiva in home una volta a settimana ("Come è andata? Cosa vorresti approfondire?") — saltabile, riappare la settimana dopo se non risposto.

### File toccati
- Migration: `supabase/migrations/migration_034_weekly_feedback.sql` (nuova), `migration_001_activity_ledger.sql` (solo commento vocabolario, additivo).
- `src/lib/ledger.ts` (`EventType`: `library.opened`, `feedback.weekly`), `src/lib/feedback.ts` (nuovo, vocabolario topic), `src/lib/availability.ts` (nuovo, raggruppamento regole agenda).
- `src/app/app/feedback-actions.ts` (nuovo, `submitWeeklyFeedback`), `src/components/feedback/weekly-feedback.tsx` (nuovo).
- `src/app/app/page.tsx` (query stato feedback settimana corrente + render prompt).
- `src/app/app/libreria/[id]/open/route.ts` (log `library.opened` dopo il gate tier).
- `src/app/coach/social/page.tsx` (aggregazioni riepilogo contenuti), `src/components/social/content-insights.tsx` (nuovo).
- `src/components/agenda/coach-agenda.tsx` (finestre raggruppate), `src/app/coach/agenda/actions.ts` (`deleteRules`, bulk).
- `STATO.md` (Onda 28), `.aios/HANDOFF.md` (questo file).

### Verifica fatta in sessione
- `npx tsc --noEmit` verde (dopo `npm install`, node_modules non presente nel clone).
- `npm run lint`: nessun nuovo errore/warning introdotto — i 3 preesistenti (`app/page.tsx` Date.now impuro, `assistant-widget.tsx`, `home-greeting.tsx` setState in effect) non toccati in questa sessione, stesso stato di Onda 27.
- `next build`: si ferma solo sulle env Supabase mancanti nel sandbox (`NEXT_PUBLIC_*`), nessun errore di codice — stesso pattern già visto nelle onde precedenti.
- **Non eseguito** (nessun accesso a un progetto Supabase reale da questo sandbox): applicazione della migration, collaudo a schermo, verifica RLS a runtime su `weekly_feedback`.

## Prossimo passo
- **Applicare `migration_034_weekly_feedback.sql` al deploy** (tabella nuova + RLS, non tocca dati esistenti).
- **Collaudo umano consigliato:** da coach, duplicare una finestra su tutta la settimana e verificare il raggruppamento a 7 chip + rimozione singolo giorno; da atleta, aprire un contenuto Libreria e rispondere al feedback settimanale, poi verificare che entrambi compaiano in "Riepilogo contenuti" su `/coach/social`; riaprire l'home nella stessa settimana e verificare che il prompt feedback non ricompaia.
- **Non fatto di proposito (vedi STATO §28, "non fatto"):** vista a griglia calendario per l'agenda (il raggruppamento risolve il sintomo segnalato senza un cambio di layout più ampio); analytics reali sui post pubblicati sui social esterni (richiederebbe integrazioni OAuth con Instagram/TikTok/YouTube, fuori scala qui).
- Resta aperto tutto il binario privacy/GDPR (DPIA, testi consenso) descritto nelle onde precedenti — non toccato qui.

## Blocchi
- Nessun nuovo blocco introdotto da questa sessione.
- Restano i blocchi già noti: `004_consents` su DPIA/consensi (legale); gate umani elencati nelle onde precedenti (MFA coach, leaked-password, backup PITR, env Upstash, CSP enforcing, gitleaks).

## Note di sessione
- Sandbox senza credenziali Supabase/Vercel reali: nessuna query eseguita contro un DB vero, solo lettura di schema/migration dal repo.
