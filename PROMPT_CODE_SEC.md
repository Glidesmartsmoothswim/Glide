# PROMPT_CODE_SEC — Runbook sicurezza per Claude Code
### GLIDE Suite · Step 1 (v2 — con baseline migrazioni + S-4) · da incollare a blocchi, in ordine

Questo runbook contiene **solo i fix eseguibili in autonomia**: chiusi, testabili, senza decisioni umane dentro.
Riferimento completo: `GLIDE_PRIVACY_SECURITY_REVIEW.md`.

> **Regola di questo runbook:** Code tocca il codice. Le decisioni legali, la retention, la mappa dati e la DPIA **non sono qui** e non devono finirci. Se Code prova a "risolverle", sta inventando.
>
> **Novità v2:** aggiunto **S-0.5** (baseline del ledger migrazioni — prerequisito a S-1, perché il fix ruolo dipende da `coach_id` della migration di tenancy) e **S-4** (cron protetti + enforcement dell'health router).

---

## ⛔ COSA CODE NON DEVE FARE (incolla questo per primo, sempre)

```
VINCOLI PER QUESTA SESSIONE — leggi prima di qualunque cosa.

NON devi:
- scrivere o modificare informative privacy, testi di consenso, policy di retention, DPIA
- decidere per quanto tempo conservare un dato
- decidere se un dato è sanitario o no
- creare tabelle di consenso o modificare lo schema dei consensi
- applicare la migration 004_consents (dipende da decisioni legali: la sblocco io)
- inventare vocabolario clinico o liste di sintomi/red-flag (sono in ADR-004)
- cancellare dati esistenti, droppare tabelle, ricreare tabelle, fare git push --force
- toccare la configurazione del progetto Supabase (regione, piano, backup): la faccio io a mano

DEVI:
- applicare i fix di sicurezza elencati nei prompt seguenti
- scrivere un TEST per ogni fix, che fallisca se il fix viene rimosso
- fermarti e chiedere se un fix richiede una scelta non tecnica

A fine di ogni prompt: aggiorna STATO.md, fai commit, scrivi 3 righe di stato.
```

---

## PROMPT S-0 — Orientamento

```
Sei sul progetto GLIDE (Next.js App Router + TypeScript + Supabase + Stripe).
Prima di scrivere codice, ispeziona e riferisci in massimo 15 righe:

1. Quali tabelle esistono in public e quali hanno RLS ATTIVA. Elenca quelle SENZA RLS.
2. Quali policy esistono su `profiles`. In particolare: un utente può fare UPDATE sulla propria riga?
   E se sì, può modificare la colonna `role`?
3. Il file app/api/stripe/webhook/route.ts esiste? Verifica la firma dell'evento
   con stripe.webhooks.constructEvent sul RAW body, o fa req.json()?
4. Il bucket dello Storage dei video è pubblico o privato?
5. Esistono variabili d'ambiente con prefisso NEXT_PUBLIC_ che contengono segreti?
   (NON leggere i valori: dimmi solo i NOMI delle variabili che iniziano con NEXT_PUBLIC_)
6. Esistono security header in next.config.js?
7. Stato del ledger migrazioni: la cartella supabase/migrations esiste ed è tracciata,
   oppure le tabelle sono state create a mano (ledger vuoto)? Elenca le migration presenti.

Scrivi il risultato in SECURITY_AUDIT.md. Non correggere ancora nulla.
```

---

## PROMPT S-0.5 — 🧱 Baseline del ledger migrazioni (prerequisito a S-1)

> **Perché prima di S-1.** Il ledger è vuoto (le 11 tabelle sono state create a mano) e il fix C-1 (S-1)
> crea `migration_006_role_lock.sql` che protegge anche `coach_id` — colonna che esiste solo dopo
> `migration_003_tenancy`. Senza baseline, o la migration di Code va su un DB non tracciato, o il role-lock
> nasce monco. Questo passo riallinea il ledger alla realtà e applica le migration già definite (001→003).

```
MODALITÀ AUTONOMA — solo preparazione, NESSUN fix di sicurezza ancora.

1. Esegui `supabase db pull` per generare una migration di BASELINE che fotografa
   lo schema esistente. Committa la baseline. NESSUN drop, NESSUNA ricreazione di tabelle.
2. Applica via ledger, IN ORDINE, e fermandoti al primo conflitto:
   - migration_001_events
   - migration_002_readiness_v2   (include il rename fatigue/soreness → Energia/Corpo)
   - migration_003_tenancy        (introduce coach_id — ADR-009)
   Se una di queste non è presente nel repo, segnalamelo e NON proseguire oltre.
3. NON applicare migration_004_consents: è bloccante e dipende da decisioni legali (DPIA + testi).
   La sblocco io.
4. Verifica che la colonna `coach_id` esista ora su `profiles`. Riporta lo stato in STATO.md.

FERMATI qui: attendo il mio OK prima di procedere con S-1.
```

### ✅ CHECKLIST TUA — dopo S-0.5
- [ ] Nessun conflitto segnalato durante l'applicazione di 001→003
- [ ] `coach_id` ora esiste su `profiles` (serve al role-lock di S-1)
- [ ] `004_consents` NON applicata (resta in attesa della DPIA)

---

## PROMPT S-1 — 🔴 I due fix critici

```
MODALITÀ AUTONOMA. Applica questi due fix e scrivi i test.

=== FIX C-1: escalation di ruolo ===
PROBLEMA: se un utente può fare UPDATE sulla propria riga di `profiles` e la colonna `role`
è aggiornabile, allora un nuotatore può eseguire
   update profiles set role='coach' where id = auth.uid()
e ottenere accesso ai dati sanitari di TUTTI gli altri nuotatori.

Crea la migration `migration_006_role_lock.sql`:

  drop policy if exists profiles_self_update on public.profiles;

  create policy profiles_self_update on public.profiles
    for update
    using      (id = auth.uid())
    with check (
      id = auth.uid()
      and role     = (select p.role     from public.profiles p where p.id = auth.uid())
      and coach_id = (select p.coach_id from public.profiles p where p.id = auth.uid())
    );

  create or replace function public.protect_role_column()
  returns trigger language plpgsql security definer as $$
  begin
    if new.role is distinct from old.role
       and current_setting('request.jwt.claim.role', true) <> 'service_role' then
      raise exception 'Cambio di ruolo non consentito';
    end if;
    return new;
  end $$;

  drop trigger if exists trg_protect_role on public.profiles;
  create trigger trg_protect_role
    before update on public.profiles
    for each row execute function public.protect_role_column();

Se la colonna `coach_id` non esiste ancora su profiles, ometti quella riga dalla policy
e SEGNALAMELO (dipende dalla migration di tenancy — dovrebbe essere già applicata in S-0.5).

TEST OBBLIGATORIO (test/security/role-escalation.test.ts):
- con un client autenticato come nuotatore, `update profiles set role='coach'` DEVE fallire
- lo stesso nuotatore DEVE poter aggiornare first_name senza errori
- il test deve fallire se la policy o il trigger vengono rimossi

=== FIX C-2: webhook Stripe senza verifica di firma ===
PROBLEMA: senza verifica, chiunque può POSTare un finto checkout.session.completed
all'endpoint e attivarsi un abbonamento gratis.

In app/api/stripe/webhook/route.ts:
- leggi il body con `await req.text()` (RAW). Se c'è req.json(), la firma non tornerà MAI: rimuovilo.
- verifica con stripe.webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET)
- su firma non valida: rispondi 400 e NON processare
- aggiungi idempotenza: crea la tabella

    create table if not exists public.stripe_events (
      id           text primary key,
      type         text not null,
      processed_at timestamptz not null default now()
    );

  inserisci event.id prima di processare. Se l'insert fallisce per chiave duplicata,
  l'evento è già stato gestito: rispondi 200 e termina. Stripe rimanda gli eventi:
  senza idempotenza un retry può raddoppiare un abbonamento o un credito lezione.

TEST OBBLIGATORIO (test/security/stripe-webhook.test.ts):
- POST con firma assente → 400
- POST con firma non valida → 400
- POST con firma valida → 200, e l'abbonamento risulta attivato
- lo stesso evento inviato due volte → attivazione UNA sola volta

Al termine: aggiorna STATO.md, commit "sec: fix C-1 role escalation, C-2 stripe webhook signature".
```

### ✅ CHECKLIST TUA — dopo S-1 (nessuna di queste è codice)
- [ ] **C-3 — Regione Supabase.** Dashboard → Settings → General → *Region*. Deve essere **UE** (Frankfurt o Ireland). Se non lo è: dimmelo, si migra ora che i dati sono pochi.
- [ ] **A-2 — MFA sull'account coach.** Supabase → Auth → MFA. È l'account che vede tutti i dati sanitari.
- [ ] **A-3 — Password.** Supabase → Auth → Policies: attiva *leaked password protection*, minimo 10 caratteri.
- [ ] **A-5 — Backup.** Supabase Pro (PITR). **E prova un restore una volta.** Un backup mai testato non è un backup.
- [ ] Esegui tu il test di C-1 a mano: da un account nuotatore, `update profiles set role='coach'`. **Deve fallire.**

---

## PROMPT S-2 — Hardening

```
MODALITÀ AUTONOMA. Quattro interventi.

=== 1. Security headers (next.config.js) ===
Aggiungi: Content-Security-Policy, Strict-Transport-Security (max-age 2 anni, preload),
X-Content-Type-Options nosniff, X-Frame-Options DENY, Referrer-Policy strict-origin-when-cross-origin,
Permissions-Policy con camera/microphone/geolocation disattivati.
La CSP deve consentire: Stripe (js.stripe.com, hooks.stripe.com), Supabase (*.supabase.co),
lo storage dei video, i font. frame-ancestors 'none'. object-src 'none'.
Verifica che il checkout Stripe continui a funzionare dopo l'aggiunta della CSP.

=== 2. Audit RLS ===
Crea uno script `scripts/rls-audit.sql` che restituisce:
  a) le tabelle di `public` con relrowsecurity = false
  b) le tabelle con RLS attiva ma NESSUNA policy (spesso è un bug, non una scelta)
Esegui, riporta il risultato, e ATTIVA RLS sulle tabelle scoperte con la policy corretta.
Se non è ovvia quale sia la policy corretta per una tabella, FERMATI e chiedimelo.

=== 3. Guardia sui segreti nel bundle ===
Crea `scripts/check-secrets.sh`: dopo `npm run build`, cerca nel contenuto di `.next/`
la SUPABASE_SERVICE_ROLE_KEY e la STRIPE_SECRET_KEY. Se le trova, esce con codice 1.
Collegalo come step obbligatorio prima del deploy.
Regola permanente: NESSUNA variabile che dia accesso privilegiato può iniziare con NEXT_PUBLIC_.

=== 4. Video: bucket privato + signed URL ===
Verifica che il bucket dei video sia PRIVATO. Nessun URL pubblico, mai.
Accesso solo tramite signed URL con TTL massimo 1 ora.
L'upload deve avvenire con URL firmato direttamente dal browser: il video non passa dal server.
TEST: un URL di un video scaduto o non firmato deve restituire 403.

Al termine: aggiorna STATO.md, commit "sec: headers, rls audit, secret guard, private video bucket".
```

### ✅ CHECKLIST TUA — dopo S-2
- [ ] Apri il sito e verifica che il **checkout Stripe funzioni ancora** (la CSP è la cosa che più spesso rompe i pagamenti)
- [ ] Verifica che un video **non sia raggiungibile** senza signed URL

---

## PROMPT S-3 — Igiene continua

```
MODALITÀ AUTONOMA.

1. Attiva Dependabot (o `npm audit` in CI) e risolvi le vulnerabilità HIGH e CRITICAL.
   Non aggiornare major version senza chiedermelo.
2. Rate limiting sugli endpoint di autenticazione e sugli endpoint che chiamano l'AI.
3. Se è presente Sentry (o qualunque logger): attiva lo scrubbing dei PII,
   disattiva il session replay (o mascheralo al 100%).
   REGOLA: nessun log deve mai contenere email, telefono, nome, o testo di note di readiness.
4. REGOLA EMAIL (applicala a tutti i template Resend esistenti):
   l'email NOTIFICA, non CONTIENE.
   ✅ "Il coach ha commentato il tuo video. Apri GLIDE."
   ❌ "Il coach ha commentato il tuo dolore alla spalla destra."
   Nessun dato sanitario, nessun contenuto di readiness, nessuna nota, in nessuna email.
   Rivedi ogni template e correggi.

Al termine: aggiorna STATO.md, commit, e scrivi in SECURITY_AUDIT.md lo stato finale
di ogni finding (C-1, C-2, A-4, A-6, A-7, M-1, M-2, M-3, M-5, M-6).
```

---

## PROMPT S-4 — 🔒 Cron protetti + enforcement dell'health router

```
MODALITÀ AUTONOMA. Due interventi. Il secondo tocca un confine: leggilo bene.

=== 1. A-2bis · Endpoint cron protetti ===
Gli endpoint chiamati dai cron di Vercel (nurture Resend, scadenza certificati,
qualunque job schedulato) devono rifiutare chiunque non sia il cron.
- Usa la variabile CRON_SECRET (server-side, MAI NEXT_PUBLIC_).
- Ogni route cron verifica l'header `Authorization: Bearer ${CRON_SECRET}`
  (Vercel lo invia automaticamente quando la variabile è impostata).
  Header assente o diverso → 401, nessuna esecuzione, nessun side effect.

TEST OBBLIGATORIO (test/security/cron-auth.test.ts):
- richiesta senza header Authorization → 401
- richiesta con secret errato → 401
- richiesta con secret corretto → 200 e il job parte
- il test fallisce se il controllo viene rimosso

=== 2. A-4 · Enforcement dell'health safety router (ADR-004) ===
ATTENZIONE: questo NON è "progettare il router". La logica clinica, il vocabolario dei sintomi
e la lista dei red-flag sono già decisi in ADR-004. Il tuo compito è VERIFICARE e RENDERE
NON AGGIRABILE la struttura — NON inventare termini medici.

Verifica e, se serve, correggi la STRUTTURA (non i contenuti clinici):
a) Il matcher deterministico gira SERVER-SIDE. Nessuna chiamata LLM è raggiungibile
   dal client senza passare prima dal router. Se esiste un percorso che salta il router, chiudilo.
b) Ogni messaggio in ingresso passa SEMPRE dal matcher PRIMA di qualunque chiamata LLM.
c) Percorso red-flag (es. cardiaco/respiratorio, come da ADR-004): risposta a TEMPLATE FISSO,
   ZERO chiamate all'LLM.
d) Verso l'LLM non parte mai un identificativo (nome, email, data di nascita): solo un
   subject_id pseudonimo. Se parte identità + contenuto insieme, correggi.

Se il vocabolario dei sintomi / la lista red-flag NON è presente nel codice o in ADR-004,
FERMATI e segnalamelo: non inventare termini clinici.

TEST OBBLIGATORIO (test/security/health-router.test.ts):
- un messaggio con un termine red-flag NON produce alcuna chiamata LLM e restituisce il template fisso
- un messaggio normale passa dal router PRIMA dell'LLM (il router è invocato per primo)
- un tentativo di chiamare l'LLM saltando il router → bloccato
- verso l'LLM non viene mai passato nome/email/data di nascita

Al termine: aggiorna STATO.md, commit "sec: cron auth (A-2bis), enforce health router (A-4)".
```

### ✅ CHECKLIST TUA — dopo S-4
- [ ] Imposta **CRON_SECRET** nelle Environment Variables di Vercel (valore lungo e casuale)
- [ ] Se S-4 si è fermato per vocabolario red-flag mancante: recupera la lista da ADR-004 e forniscila

---

## Cosa resta aperto dopo questo runbook (non è codice, è tuo)

| Finding | Cosa manca | Chi decide |
|---|---|---|
| **A-1** | Architettura dei consensi (D1) + `migration_004_consents` | Tu + legale. La migration è pronta nel master plan, ma i **testi** dei consensi no. |
| **C-3** | Regione Supabase in UE | Tu, dalla dashboard |
| **A-2 / A-3 / A-5** | MFA coach · leaked-password · backup+restore provato | Tu, dalla dashboard |
| — | Mappa dati e retention | Tu |
| — | DPIA | Tu + legale |
| — | Certificato medico: scansione o sola scadenza | Tu |
| — | Analytics: GA4 o Plausible | Tu |

---

*Prima si mette in sicurezza la vasca, poi ci si nuota dentro.*
