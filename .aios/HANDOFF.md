# Handoff — Gestionale GLIDE · 30 luglio 2026

## Sessione appena chiusa
- **Task 1 — Onda 25 (riepilogo Open).** Nella scheda coach del nuotatore, solo per i tier `open`/`open_plus`, sezione "Riepilogo Open" (fase di test): stat svolti/metri/feedback, **torta** del feedback post-sessione (RPE in fasce) con RPE e umore medi, ultimi feedback. Dati da `workout_completions` + `v_readiness`. recharts lazy (`ssr:false`). Nessuna migration, nessun dato nuovo raccolto. → **PR #28 mergiata in `main`**, preview Vercel Ready.
- **Task 2 — apertura binario privacy/GDPR.** Prodotto **`GLIDE_DATA_MAP.md`**: mappa *tecnica* dei trattamenti ricavata dallo schema reale. Solo fatti dal codice; le colonne legali (base giuridica, retention, DPIA) sono lasciate vuote di proposito.

### File toccati
- **Onda 25 (in `main`, PR #28):** `src/components/coach/open-recap-pie-impl.tsx`, `src/components/coach/open-recap-pie.tsx` (nuovi), `src/app/coach/nuotatori/[id]/page.tsx`.
- **Privacy:** `GLIDE_DATA_MAP.md` (nuovo), `STATO.md` e `.aios/HANDOFF.md` (aggiornati). Branch `claude/gdpr-data-map`.

### Cosa dice la mappa (fatti utili alla prossima sessione)
- **Categoria particolare (Art. 9)** già classificata dal progetto: `readiness`/`v_readiness`, `medical_certificates`, contenuto chat. `race_videos` = immagine di persona identificabile.
- **Chat assistente NON persistita:** `/api/assistant` ritorna solo testo, nessuna tabella `messages`. Il contenuto sanitario transita ma non si archivia; verso l'LLM va solo il messaggio, mai l'identità (ADR-004, `safety.test.ts`).
- **`medical_certificates` archivia il file PDF** (bucket privato `medical`) + scadenza + note → nodo minimizzazione G9 (decidere se basta la scadenza).
- **`glide_scores` = scoring/profilazione** → pesa sull'obbligo DPIA (G6).
- **Sub-responsabili:** Supabase `eu-central-1` (UE ✓); da confermare region/DPA di Stripe (USA/SCC), Resend, Cloudflare R2, Vercel, e il **provider LLM** dell'assistente.

## Prossimo passo
- **NON codice (legale/Alessio):** DPIA (Art. 35 — probabile obbligo per dati sanitari su larga scala + scoring) + testi di consenso Art. 9. Solo dopo si sblocca `migration_004_consents`. Compilare le colonne "base giuridica"/"retention" della mappa e il §3 trasferimenti.
- **Codice, quando sbloccato:** architettura tecnica dei consensi (schema `004`, oggi bloccato), diritti dell'interessato (export dati, oblio via pseudonimizzazione ADR-003, revoca consenso), auto-purge retention.
- **Gate umani ancora aperti (dashboard, non codice):** MFA account coach · leaked-password (Pro) · backup PITR + **restore provato** · env Upstash su Vercel · promozione CSP a enforcing dopo verifica report + checkout Stripe · scansione git history (gitleaks).

## Blocchi
- `004_consents` bloccato su DPIA + testi consenso (decisione legale).
- Confine confermato: informative/consensi/retention/DPIA non li tocca Code; la mappa fornisce solo la base fattuale.

## Note di sessione
- **git push nativo rotto** in questa sessione (proxy: "Unauthorized"). Workaround usato: **GitHub MCP** (create/merge PR) — è la via da usare per le operazioni remote finché il proxy non è ripristinato.
