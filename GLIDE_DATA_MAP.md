# GLIDE — Mappa dei trattamenti (inventario tecnico)

**Aggiornato:** 30 luglio 2026
**Cosa è.** Fotografia *tecnica* di dove vivono i dati personali in GLIDE, ricavata dallo schema e dal codice reali (tabelle `public.*`, bucket Storage, chiamate `.from()`). Alimenta — ma **non sostituisce** — il Registro dei trattamenti (Art. 30), la DPIA e l'informativa.

**Cosa NON è.** Non fissa basi giuridiche, tempi di retention né esiti DPIA: quelle colonne sono lasciate vuote (`→ legale`) di proposito. Sono decisioni legali/organizzative, fuori dal perimetro del codice (vincolo di sessione + MEMORY.md).

**Classificazione dei dati particolari (Art. 9).** Non inventata qui: ripresa da `ADR-004` (router sanitario) e `MEMORY.md` — "la chat è un contenitore di dati sanitari", readiness e certificati sono trattati come categoria particolare. Dove la classificazione non è già decisa dal progetto, è marcata `da confermare (legale)`.

---

## 1. Inventario per tabella

Legenda categoria: **ID** identificativo/anagrafico · **A9** categoria particolare Art. 9 (già classificato dal progetto) · **A9?** adiacente, da confermare · **PAG** pagamento/fiscale · **OPS** operativo/config (non personale o minimamente).

| Store | Dati principali | Cat. | Accesso (RLS/codice) | Base giuridica | Retention |
|---|---|---|---|---|---|
| `profiles` | nome, cognome, email, `role`, `tier`, `athlete_type`, `onboarding_done`, `coach_id` (assente) | ID | self + coach; `role` non auto-modificabile (migration_030 + trigger) | → legale | → legale |
| `intake` | obiettivi, frequenza, vasca, esperienza, autovalutazione, stili, aree miglioramento | ID / A9? | self select/insert/update; coach select | → legale | → legale |
| `personal_bests` | tempi personali per stile/distanza | ID | self + coach | → legale | → legale |
| `objectives` | obiettivi dell'atleta | ID | self + coach | → legale | → legale |
| `readiness` | RPE, energia, corpo, umore (pre/post seduta) | **A9** | self + coach | → legale | → legale |
| `v_readiness` (view) | derivata da `readiness` | **A9** | come sopra | → legale | (segue sorgente) |
| `medical_certificates` | `file_key` (PDF nel bucket `medical`), `mime_type`, `data_scadenza`, `note` | **A9** | legge proprietario+coach; scrive/cancella solo proprietario; bucket privato, coach via URL firmato server-side | → legale | → legale (vedi G9: si archivia il **file**, non solo la scadenza) |
| `race_videos` | video del nuotatore (persona identificabile) + metadata; purge tramite `src/lib/retention.ts` | **A9?** (immagine) | self + coach; bucket privato + signed URL | → legale | logica purge presente in codice; **durata → legale** |
| `video_comments` | commenti del coach sul video | ID | self + coach | → legale | → legale |
| `workouts` | allenamenti assegnati | ID | self + coach | → legale | → legale |
| `workout_completions` | sedute svolte (metri, focus, data) | ID | self + coach | → legale | → legale |
| `programs` · `program_phases` · `program_notes` | programmazione e note del coach | ID | self + coach | → legale | → legale |
| `glide_scores` | punteggio/scoring dell'atleta | ID / **profilazione** | self + coach | → legale | → legale · **rilevante per DPIA (Art. 35): scoring** |
| `activity_events` | ledger append-only (ADR-003) | ID | pseudonimizzabile per l'oblio (ADR-003), non cancellabile | → legale | append-only; oblio per pseudonimizzazione |
| `swimmer_badges` · `badges` | badge conferiti | ID | self + coach | → legale | → legale |
| `subscriptions` | stato abbonamento / tier | PAG | self + coach; entitlement solo da eventi Stripe | Contratto + obbligo legale (fiscale) → confermare | → legale (obbligo fiscale ≠ oblio) |
| `transactions` | transazioni (importi, riferimenti); **nessun dato carta** (PCI in Stripe) | PAG | self + coach | Contratto + obbligo legale | → legale |
| `stripe_events` | `event.id` per idempotenza webhook | OPS | server-side | — | tecnico |
| `lesson_credits` · `lesson_tokens` · `plan_entitlements` | crediti/entitlement lezioni | PAG/OPS | self + coach | → legale | → legale |
| `bookings` | prenotazioni lezioni/slot | ID | self + coach | → legale | → legale |
| `events` · `event_signups` · `event_tests` · `signup_tests` · `tests` · `runsheet` | eventi/videoanalisi/test | ID / A9? | self + coach (dove personale) | → legale | → legale |
| `leads` | contatto + risultati "Test del Nuotatore" (da **non-clienti**) | ID / **A9?** | coach only | → legale (G11: consenso al punto di raccolta) | → legale (G9: auto-purge) |
| `notifications` | notifiche (solo riferimenti, **niente contenuto sanitario** — regola "email/notifica notifica, non contiene") | ID | self | → legale | → legale |
| `social_posts` · `library_items` · `app_config` · `services` · `availability_rules` · `availability_exceptions` · `zone_rpe_bands` | contenuti coach / config | OPS | coach / pubblico dove previsto | — | — |

> **Chat assistente:** **non persistita.** `/api/assistant` esegue il router deterministico e ritorna solo testo; nessuna tabella `messages`/`conversations`. Il contenuto potenzialmente sanitario ("mi fa male la spalla", Art. 9) transita ma non viene archiviato. Vedi §4.

---

## 2. Storage (bucket)

| Bucket | Contenuto | Cat. | Regime |
|---|---|---|---|
| `medical` | certificati medici (PDF) | **A9** | privato; oggetti nella cartella `=uuid` del proprietario; coach accede solo via URL firmato generato server-side |
| `race-videos` (Supabase) / R2 | video del nuotatore | **A9?** (immagine) | privato; signed URL a TTL breve; upload diretto dal browser |

---

## 3. Sub-responsabili (Art. 28) e trasferimenti (Capo V) — scheletro

Da completare con evidenza DPA firmata e region reale (`→ legale/infra`).

| Responsabile | Ruolo | Region nota | Extra-UE? | Garanzia |
|---|---|---|---|---|
| Supabase | DB + Auth + Storage | `eu-central-1` (Frankfurt) ✓ | No | — |
| Cloudflare R2 | storage video | → confermare jurisdiction UE | → confermare | DPA/SCC |
| Stripe | pagamenti | USA | Sì | SCC (DPA Stripe) |
| Resend | email transazionali (`glideswim.it`) | → confermare | → confermare | SCC/DPA |
| Vercel | hosting + serverless functions | → confermare region function (es. `fra1`) | → confermare | DPA |
| LLM provider (assistente) | elaborazione messaggi | → **confermare provider + DPA + zero-retention** | probabile Sì | SCC + zero-retention |

---

## 4. Flusso verso l'LLM (minimizzazione — A5/D4)

- Ogni messaggio passa **prima** dal router deterministico server-side (`src/lib/assistant/router.ts`, ADR-004). Nessun percorso client raggiunge l'LLM saltando il router.
- Percorso red-flag → **template fisso**, zero chiamate LLM.
- Verso l'LLM parte il **contenuto del messaggio**, non identità (nome/email/data nascita). Copertura in `src/lib/assistant/safety.test.ts`.
- **Aperto:** confermare il provider LLM, firmare la DPA e usare tier a zero data retention; verificare esplicitamente che nessun identificativo sia concatenato al prompt.

---

## 5. Gap rispetto all'audit (G1–G12) — stato

| # | Voce | Stato |
|---|---|---|
| G1 | Base giuridica Art. 9 (consenso esplicito) | **Aperto** — `migration_004_consents` bloccata su DPIA + testi (→ legale) |
| G2 | Mappa basi giuridiche per trattamento | **Parziale** — colonna "base giuridica" qui, da compilare (→ legale) |
| G3 | Informativa Art. 13 (sito + app) | **Aperto** (→ legale) |
| G4 | DPA con i responsabili | **Aperto** — vedi §3 (→ legale/infra) |
| G5 | Mappa trasferimenti Capo V | **Scheletro** in §3, da completare |
| G6 | **DPIA (Art. 35)** — probabile obbligo (dati sanitari su larga scala + scoring `glide_scores`) | **Aperto** (→ legale) |
| G7 | Registro trattamenti Art. 30 | **Alimentabile** da questo inventario, da formalizzare |
| G8 | Diritti interessato (export/oblio/revoca/unsubscribe) | **Parziale** — oblio via pseudonimizzazione previsto (ADR-003); export/revoca da implementare |
| G9 | Retention & minimizzazione | **Aperto** — certificato: si archivia il file (decidere se basta la scadenza); leads: auto-purge (→ legale) |
| G10 | Age-gate adulti-only | Da confermare l'assunzione |
| G11 | Consenso al punto di raccolta del Test (leads) | **Aperto** (→ legale) |
| G12 | Cookie/analytics | Decisione aperta (raccomandato cookieless) |

---

## 6. Confine (cosa questo documento non decide)

Testi di consenso, informativa, DPIA, durate di retention, se un dato "borderline" è sanitario: **decisione legale/organizzativa di Alessio + legale**, non del codice. Questo file fornisce solo la base fattuale su cui quelle decisioni si appoggiano.

---
*GLIDE — Mappa dei trattamenti · documento di lavoro tecnico, non consulenza legale.*
