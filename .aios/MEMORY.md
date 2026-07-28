# MEMORY — GLIDE

<!-- Solo conoscenza STABILE. Niente stato temporaneo (quello sta in CURRENT_STATE / HANDOFF). -->

## Sicurezza & dati
- **Mai una nuova migration senza baseline tracciata** (`supabase db pull` prima). Il ledger è nato vuoto: non ripetere l'errore.
- **La chat è un contenitore di dati sanitari.** "Mi fa male la spalla" è art. 9 anche se sta in `messages`. Classificala e proteggila come tale.
- **L'email notifica, non contiene.** Mai dati sanitari, readiness o note nel corpo di un'email. ✅ "Il coach ha commentato il tuo video." ❌ "…il tuo dolore alla spalla."
- **Verso l'LLM solo `subject_id` pseudonimo.** Mai identità + contenuto insieme. I red-flag non passano mai da un LLM (ADR-004).
- **`service_role` bypassa la RLS.** Solo server-side. Nessuna variabile privilegiata inizia con `NEXT_PUBLIC_`. Mai, nessuna eccezione.
- **Il ruolo non è auto-modificabile.** Policy `with check` + trigger. Il fix ruolo dipende da `coach_id` (`003_tenancy`): applicala prima.
- **Webhook Stripe:** raw body + firma + idempotenza. `req.json()` rompe la firma.
- **Dati fiscali non si cancellano** (obbligo di legge): stanno fuori dal perimetro dell'oblio.
- **Cancellazione ↔ ledger append-only** si risolve per pseudonimizzazione (distruggere la mappa identità↔soggetto), non cancellando il ledger (ADR-003).

## Confine dell'AI (ADR-001)
- L'AI opera solo a **L0 (lettura)** e **L1 (segnalazione al coach)**. Nessuna scrittura/modifica su `workouts` o programmazione. Nessuna interpretazione di sintomi.

## Voce & brand
- Registro adulto, arguzia italiana, **non** motivazionale americana. Tagline: *vasca dopo vasca*.
- Due superfici, due registri: il **saluto** è l'ospite caloroso (proverbiale); i **badge** sono il maestro che certifica (asciutto, ironico).
- **La Scivolata ≠ Glide**: distinti, non confonderli.
- Badge: nominano la **restituzione sensoriale** dell'acqua, non la causa tecnica. Mai badge ottenibili allenandosi *più* del prescritto (ADR-005). Nessuna emoji, nessun coriandolo.
- Tipografia web: Glacial Indifference (400/700), `font-synthesis: none`, body ≥ 17px. Vietati i pesi 500/600 interpolati.

## Collaborazione
- **Spec-first, poi Code.** Claude (CTO) scrive ADR/spec; Claude Code esegue in sequenza.
- **Stop-gate:** i cancelli separano le fasi. Non superarli senza OK umano.
- **Le decisioni legali/di retention/DPIA non le tocca Code.** Se ci prova, sta inventando.
