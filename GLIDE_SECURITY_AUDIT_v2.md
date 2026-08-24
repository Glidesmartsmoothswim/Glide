# GLIDE — Security Audit v2 (live, verificato via MCP)
**Data:** 24 agosto 2026 · **Metodo:** query dirette su Supabase (project `unsdbeliaunhhgnuefyz`), non solo revisione documentale · **Aggiorna:** `GLIDE_SECURITY_AUDIT_v1.md` (18 ago) e il finding intermedio del 23 ago (arancio/rosso RPC)
**Non è consulenza legale.** Le voci GDPR restano da validare con DPO/legale.

---

## 0. Sintesi esecutiva

Dati reali già in tabella: **11 profili, 42 readiness, 3 certificati medici, 10 video**. Non è più un audit "pre-dati" — ogni gap trovato qui è già un'esposizione attiva, non teorica.

| Stato | # | Nota |
|---|---|---|
| 🔴 Blocca produzione **ora** | 2 | Un solo account coach = una sola porta su tutti i dati sanitari |
| ✅ Chiuso e verificato dal vivo | 9 | Include il fix IDOR di oggi stesso |
| 🟠 Da chiudere prima del lancio pubblico | 4 | Basso sforzo |
| ⚖️ Rischio multa GDPR (separato, non tecnico) | 5 | Invariato da v1 |

**La cosa più importante di questo audit:** il fix critico rosso (IDOR sui token lezione) segnalato il 23 agosto **è stato applicato e verificato in produzione oggi stesso** (migration `20260824130025` + `20260824130316`). Buona notizia. La cattiva: l'account coach — l'unico che vede dati sanitari di tutti — **non ha MFA attivo**, verificato ora, in diretta, con dati reali già dentro.

---

## 1. 🔴 BLOCCA PRODUZIONE ORA

### B-1 — MFA assente sull'account coach
**Verificato in diretta:** `glide.smartswim@gmail.com` (unico ruolo `coach`) ha **0 fattori MFA verificati**.
**Rischio:** è l'account con `is_coach()=true`, che in RLS bypassa quasi ogni restrizione (readiness, certificati medici, video, chat, transazioni di tutti). Un solo password compromesso (phishing, riuso credenziali, data breach di terzi) = accesso completo a dati sanitari reali di persone reali, oggi. Non è un rischio futuro.
**Fix:** attiva MFA (TOTP) sull'account coach da Supabase Dashboard → Authentication → Users, oppure enforcement lato Auth. **5 minuti, azione tua, non di Claude Code.**

### B-2 — Leaked Password Protection disattivata
**Verificato in diretta** (Supabase Auth Advisor): la verifica contro HaveIBeenPwned è **disabilitata**.
**Rischio:** combinato con B-1, è l'unico strato di difesa rimasto sulla password del coach. Se quella password è già in una fuga dati nota, chiunque può provarla.
**Fix:** Dashboard → Authentication → Policies → Password Security → abilita "Leaked password protection" + lunghezza minima 10. **2 minuti, azione tua.**

---

## 2. ✅ CHIUSO E VERIFICATO DAL VIVO (non dalla documentazione — dal DB)

| Finding originale | Verifica live | Evidenza |
|---|---|---|
| **C-1** Escalation di ruolo | ✅ Chiuso | `role` ha default `'swimmer'`; policy `profiles: modifica propria` blocca `role` diverso da quello letto da DB salvo `is_coach()`; **trigger `protect_role_column` attivo**. Bonus non richiesto: esiste anche `protect_tier_column` (blocca auto-upgrade di tier/abbonamento) |
| **C-2** Webhook Stripe / idempotenza | ✅ Tabella chiusa | `stripe_events` esiste (migration `stripe_events`), RLS `using(false) / check(false)` — **zero accesso client, nemmeno in lettura**. La verifica della firma vive nel codice Next.js, non ispezionabile da qui: vedi §4-C4 |
| **C-3** Regione Supabase | ✅ Chiuso | `eu-central-1` (Francoforte) confermato via API progetto |
| **C-5** Storage video/certificati privati | ✅ Chiuso | Bucket `race-videos`, `medical`, `library` tutti `public=false`; RLS su `storage.objects` scoping per cartella-utente (`foldername[1] = auth.uid()`) |
| **Rosso 23/8** IDOR su `link_lesson_token`/`release_lesson_token`/`reserve_lesson_token` | ✅ Chiuso **oggi** | Migration `rpc_ownership_checks` + `rpc_ownership_checks_fix_null_safe` (24/8). Ogni funzione ora verifica `auth.uid()=swimmer_id OR is_coach() OR service_role` prima di operare |
| **Arancio 23/8** `grant_monthly_tokens()` chiamabile pubblicamente | ✅ Chiuso | `EXECUTE` risulta concesso **solo** a `postgres`/`service_role`; assente dall'advisor di sicurezza |
| **A-1** Copertura RLS tabelle | ✅ Chiuso | Tutte le 40 tabelle `public.*` hanno RLS **enabled** con policy esplicite; nessuna tabella con dati personali usa `using(true)` senza scoping |
| search_path hijacking su funzioni `SECURITY DEFINER` | ✅ Chiuso | Tutte le 8 funzioni `SECURITY DEFINER` fissano `search_path=public` |
| Viste senza `security_invoker` | ✅ Chiuso | Le 4 viste (`v_monthly_revenue`, `v_efficiency_points`, `v_readiness`, `v_effetto_acqua`) hanno `security_invoker=on` |

---

## 3. 🟠 DA CHIUDERE PRIMA DEL LANCIO PUBBLICO

### C-6 — `EXECUTE` su token RPC ancora aperto ad `anon`
Il fix IDOR di oggi rende le tre funzioni **funzionalmente sicure** (un `anon` che le chiama riceve `not authorized`, perché `auth.uid()` è null). Ma restano **chiamabili da chi non è nemmeno autenticato** — superficie d'attacco inutile. Fix: revoca `EXECUTE` da `anon`, mantieni `authenticated`. → prompt pronto in `PROMPT_CODE_SEC_S5.md`.

### C-7 — `zone_rpe_bands` leggibile da chiunque, anche non autenticato
Policy `bands_read` usa `using(true)` **senza restrizione di ruolo** → la mappatura Z1–Z5/RPE del protocollo (la metodologia interna, quella che nel copy customer-facing è volutamente nascosta) è interrogabile via `GET /rest/v1/zone_rpe_bands` da chiunque, anche senza login. Non è un problema GDPR (zero dati personali), è un problema di **proprietà del metodo**: un concorrente può scaricare la struttura esatta del protocollo con una chiamata REST. Fix: restringi a `authenticated`.

### C-8 — Coach: `UPDATE` senza restrizioni su qualunque profilo
La policy `profiles: modifica propria o coach` dà a `is_coach()` bypass totale (using **e** check) su **qualsiasi riga**, non solo sui propri swimmer — perché la colonna `coach_id` (tenancy) non esiste ancora nello schema. Oggi, con un solo coach, il rischio pratico è basso. Ma significa che una sessione coach compromessa può riscrivere ruolo/dati di chiunque, non solo "vedere". **Non è un fix da automatizzare ora** — dipende dalla decisione di tenancy multi-coach (Motore C) che è tua, non tecnica. Lo segnalo come promemoria per l'ADR quando apri la rete coach.

### C-4 — `service_role` key: da riverificare a livello di codice
Non ispezionabile da qui (i file Next.js reali non sono nella knowledge base di questo progetto). L'audit v1 prescriveva un grep del bundle di build (`grep -r "service_role" app/ components/` + verifica `.next/`). Se S-2 di `PROMPT_CODE_SEC.md` è già stato eseguito da Claude Code, probabilmente è già chiuso — ma non risulta da nessuna parte una conferma esplicita in `STATO.md`. Richiede un passaggio di verifica, non un nuovo fix.

### Backup & restore
Non verificabile via gli strumenti MCP disponibili in questa sessione (serve la sezione Billing/Backups della dashboard, non esposta via SQL). Resta un'azione tua: conferma piano Pro + **prova un restore vero**, non solo "il backup esiste".

---

## 4. ⚖️ RISCHIO GDPR / MULTE — invariato rispetto al 18/8, riportato per completezza

Questa sezione non è cambiata dall'ultimo giro: nessuna delle voci sotto è verificabile via Supabase MCP, perché non sono problemi tecnici ma organizzativi/legali.

| Voce | Stato | Perché è un rischio multa |
|---|---|---|
| **DPIA (art. 35)** | Non avviata | Dati sanitari + profilazione + monitoraggio sistematico = il caso da manuale per cui l'art. 35 esiste. "Un solo coach" attenua ma non elimina l'obbligo di valutazione. Lead time più lungo di tutto il resto: **è la voce da avviare per prima**, in parallelo a tutto il resto |
| **Informativa privacy + consensi granulari (D1)** | Bozze pronte, testi consensi mancanti | Trattare dati sanitari senza base giuridica esplicita e consenso granulare tracciato è una delle violazioni più sanzionate dal Garante |
| **DPA con i processor** (Supabase, Stripe, Resend, Cloudflare R2) | Da confermare/firmare | Senza DPA firmato, ogni trasferimento a un processor è tecnicamente non coperto, anche se il processor stesso è conforme |
| **Registro dei trattamenti (art. 30)** | Bozza esistente, da validare | Obbligatorio con dati di categoria particolare, indipendentemente dalla dimensione dell'azienda |
| **Indirizzo legale incompleto** sui documenti (manca città/CAP) | Aperto | Blocco formale minore ma reale: un'informativa con indirizzo incompleto è contestabile |

Nota fiscale collaterale (non GDPR ma stessa famiglia di rischio "multa"): Stripe Ireland fattura le fee come B2B intra-UE — verifica con il commercialista l'eventuale obbligo di reverse charge/autofattura sulle commissioni di processing, già segnalato in sessioni precedenti.

---

## 5. Cosa NON ho potuto verificare da qui (limiti dell'audit)

- **Codice applicativo Next.js** (webhook signature, security headers, rate limiting, health router enforcement, cron auth, PII scrubbing nei log): questo progetto Claude non ha i file `app/api/**` in knowledge base. Tutto ciò che riguarda `PROMPT_CODE_SEC.md` S-2/S-3/S-4 va verificato leggendo `STATO.md`/`SECURITY_AUDIT.md` aggiornati da Claude Code, o ri-caricando quei file qui.
- **Piano Supabase e configurazione backup**: non esposta via SQL/MCP.
- **MFA enforcement policy-level** (obbligatorietà, non solo stato attuale): verificabile solo da dashboard Auth.

---

## 6. Priorità d'attacco

1. **Oggi**: B-1 (MFA coach) + B-2 (leaked password) — 10 minuti totali, azione tua, dashboard Supabase.
2. **Questa settimana**: C-6 + C-7 via `PROMPT_CODE_SEC_S5.md` (Claude Code, autonomo, basso rischio) + verifica C-4 (grep manuale o richiesta a Code).
3. **In parallelo, da subito**: avvio DPIA — è la voce a lead time più lungo di tutte.
4. **Prima di aprire la rete coach (Motore C)**: risolvi C-8 con un ADR di tenancy dedicato.
5. **Prima del prossimo pagamento reale**: conferma backup/restore provato.

---

*GLIDE — Security Audit v2 · verificato dal vivo il 24/8/2026 · non sostituisce revisione legale/DPO.*
