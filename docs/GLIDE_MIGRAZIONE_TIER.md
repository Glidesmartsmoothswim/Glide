# GLIDE — Vocabolario dei livelli nel database: proposta di migrazione

**Risposta a:** `GLIDE_AUDIT_COERENZA.md` §8 · A4 (vedi §4)
**Data:** 13 settembre 2026
**Stato: PROPOSTA. Niente è stato eseguito.** Nessuna DDL applicata, nessun dato
toccato. Lo SQL sta in `docs/proposte/tier-vocabolario.sql`, fuori da
`supabase/migrations/`, così non può finire in produzione per errore.

---

## 1 · Cosa ho verificato

Schema e conteggi letti sul progetto di produzione (`unsdbeliaunhhgnuefyz`,
Postgres 17.6) il 13 settembre 2026, con sole query di lettura: `pg_constraint`,
`information_schema.columns`, `pg_policy`, `pg_proc`, `pg_class`, più i
conteggi e le distribuzioni reali dei valori. Il codice che li consuma è stato
letto in `src/`.

---

## 2 · Non sono tre vocabolari: sono due assi più uno

L'audit segnala tre tabelle con valori diversi. La verifica dice qualcosa di
più preciso, e di più scomodo: **la colonna si chiama `tier` in cinque posti, e
descrive due cose diverse.** Questo è il difetto vero. I "tre vocabolari" sono
il sintomo.

### Asse A — livello di accesso (autorevole, è quello che l'utente vede)

| Oggetto | Valori | Vincolo in DB | Righe |
|---|---|---|---|
| `profiles.tier` | `free` · `open` · `open_plus` · `one_to_one` | `profiles_tier_check` | 18 |
| `library_items.visibility` | gli stessi quattro | `library_items_visibility_check` | 0 |

Consumato da `public.my_tier()` nelle RLS e da `ACCESS_MATRIX` in
`src/lib/access.ts`. È l'unica sorgente di verità del gating. Corrisponde uno a
uno a Base · Open · Open+ · Elite 1:1 di sito e prototipo — `TIER_LABEL` in
`src/lib/access.ts:27` fa la traduzione.

### Asse B — tipo di servizio (l'etichetta operativa che il coach mette sul profilo)

| Oggetto | Valori | Vincolo in DB | Righe |
|---|---|---|---|
| `profiles.service_type` | `coaching_1_1` · `open` · `both` | `NOT NULL default 'open'` (nessun check) | 18 |
| `plan_entitlements.tier` | gli stessi tre | chiave primaria | 3 |
| `race_videos.tier` | `coaching_1_1` · `open` | `race_videos_tier_check` | 10 |
| `events.audience` (`text[]`) | gli stessi tre | default `{coaching_1_1,both,open}` | 1 |

**Qui sta la trappola.** `plan_entitlements.tier` e `race_videos.tier` non
contengono livelli: contengono tipi di servizio. Il nome della colonna mente. Il
commento in `supabase/migrations/migration_005_booking.sql:119` lo dichiara
(`-- = profiles.service_type REALE`), ma un commento non è un contratto, e la
confusione è già passata nel codice: in `src/app/app/prenota/page.tsx:90` e in
`src/app/api/events/signup/route.ts:57` la variabile locale si chiama `tier` e
contiene `service_type`.

### Asse C — SKU commerciale richiesto all'attivazione

| Oggetto | Valori | Vincolo in DB | Righe non nulle |
|---|---|---|---|
| `profiles.requested_tier` | `open` · `open_plus` · `one_to_one_monthly` · `one_to_one_season` | `profiles_requested_tier_check` | 1 |

Legittimamente distinto: `one_to_one_monthly` e `one_to_one_season` sono due
listini che sbloccano lo stesso livello di accesso `one_to_one`. Va solo
documentato, non allineato.

### Morto — l'eredità di Stripe

| Oggetto | Valori | Righe |
|---|---|---|
| `subscriptions.tier` | `open` · `open_water` · `elite` | **0** |

`open_water` ed `elite` non esistono in nessun altro punto del sistema, né nel
sito né nel prototipo. È il vocabolario della specifica pre-Stripe, dismesso da
ADR-014 (`migration_043`).

---

## 3 · Perché `subscriptions` si può deprecare senza rischi

Verificato, non supposto:

- **0 righe.** Niente da migrare, niente da perdere.
- **Nessuna vista, nessuna funzione, nessuna policy** in `public` la
  nomina — `pg_get_viewdef`, `pg_get_functiondef` e `pg_get_expr(polqual)`
  passati al setaccio: zero riscontri.
- **Nessuna foreign key entrante.** L'unica FK è uscente
  (`subscriptions_swimmer_id_fkey → profiles.id`).
- **Zero riferimenti in `src/`.** Nessun `.from("subscriptions")`. Insieme a
  `badges`, `messages` e `stripe_events` è una delle quattro tabelle che il
  codice dell'app non tocca mai.
- **Già di fatto in sola lettura.** RLS attiva, e l'unica policy è un SELECT
  (`abbonamenti: lettura propria o coach`). Nessuna policy di scrittura: solo
  la `service_role` potrebbe scrivere, e non lo fa.

Un'avvertenza legale, perché il difetto ha una faccia documentale:
`withdrawal_waived_at` e `withdrawal_waiver_ip_hash` (`migration_038`) sono la
prova server-side della rinuncia al recesso. Oggi quella prova si scrive
altrove — `migration_043`, il flusso manuale di ADR-014 — e qui non c'è nessuna
riga, quindi non si perde nessuna evidenza. Se un giorno si arrivasse alla
`drop table`, questo va riverificato con un conteggio, non con un ricordo.

---

## 4 · La migrazione proposta, in quattro fasi

Ordinate per rischio crescente. **Le fasi 1 e 2 si possono fare subito e non
toccano una riga di dati né una riga di codice applicativo.** Le fasi 3 e 4
richiedono una decisione e un cambio di codice coordinato, quindi vanno
approvate prima.

### Fase 1 — Dichiarare il morto, morto (rischio zero, reversibile)

`comment on` su tabella e colonna di `subscriptions`, e `revoke` esplicito di
INSERT/UPDATE/DELETE ad `authenticated` e `anon`. Nessuna DDL strutturale,
nessun `drop`, nessun `rename`. L'effetto è solo questo: chi apre lo schema
legge che è legacy, e chi provasse a scrivere non può.

Perché non un `drop`: una tabella vuota non costa nulla, e finché il dossier
legale non ha chiuso il capitolo recesso, l'eliminazione è un guadagno nullo a
fronte di un rischio non nullo. Si rimanda a una stagione contabile chiusa.

### Fase 2 — Documentare i due assi nello schema (rischio zero)

`comment on column` su tutte e otto le colonne degli assi A, B e C, ciascuna
con l'asse a cui appartiene e il vocabolario ammesso. Più un check constraint
mancante su `profiles.service_type`, che oggi è un `text` libero con default
`'open'`: nulla in DB impedisce di scriverci `elite`. Aggiungerlo è
non distruttivo — i 18 valori presenti lo soddisfano già, verificato — e chiude
la porta a un quarto vocabolario nato per errore di battitura.

Aggiungo anche una vista di sorveglianza, `v_tier_coherence`, che elenca i
profili in cui asse A e asse B non si parlano. Oggi ne trova due — vedi §5.

### Fase 3 — Rinominare le colonne che mentono (richiede cambio di codice)

`plan_entitlements.tier` → `service_type`, `race_videos.tier` →
`service_type`. `alter table ... rename column` non perde dati e non
ricostruisce la tabella; a rompersi è il codice che nomina la colonna vecchia,
e sono **tre punti, tutti trovati**:

| File | Riga | Cosa fa |
|---|---|---|
| `src/lib/booking/credits.ts` | 79 | `.from("plan_entitlements").eq("tier", serviceType)` |
| `src/lib/booking/credits.ts` | 18 | il campo `tier` del tipo `Entitlement` |
| `src/app/app/video/actions.ts` | 176 | `const tier = is11 ? "coaching_1_1" : "open"` scritto in `race_videos.tier` |
| `src/app/coach/agenda/videoanalisi-actions.ts` | 310 | idem, sull'insert della coda videoanalisi |

Due opzioni, e ho una preferenza.

**3a — rinomina secca, codice aggiornato nello stesso PR** *(raccomandata).*
Quattro punti di codice, tutti in file già coperti dai test
(`src/lib/access.test.ts` esercita il percorso entitlement). La finestra di
incoerenza è la durata del deploy, e la rinomina va eseguita **dopo** il deploy
del codice solo se si aggiunge prima la vista di compatibilità; altrimenti
prima la DDL e subito il deploy. Su un progetto single-coach con 17 nuotatori,
in una finestra notturna, è la scelta onesta: costa dieci minuti e chiude il
problema.

**3b — rinomina più vista di compatibilità.** `create view
public.plan_entitlements_tier_compat as select service_type as tier, ... ` per
deployare codice e schema in momenti diversi. Più sicura in astratto, ma
aggiunge un oggetto che va poi ricordato e rimosso: un secondo debito per
pagarne uno. La sconsiglio qui.

### Fase 4 — Decidere cosa fare di `race_videos.tier` (richiede una decisione tua)

Verificato: quella colonna **non viene mai letta per decidere niente.** È
`NOT NULL`, la si scrive in due punti, e in nessun punto del codice — né in
`src/`, né in una vista, né in una policy — qualcuno la interroga. La decisione
che sembra portare (videoanalisi inclusa sì o no) è già scritta sulla stessa
riga, nelle colonne `paid` e `status`, e da quelle dipende l'interfaccia.

È una denormalizzazione a sola scrittura: un dato prodotto e mai usato. Tre
strade:

1. **Deprecarla** — commento, `drop not null`, e smettere di scriverla. Le 10
   righe esistenti restano. È la strada che consiglio: elimina un vocabolario
   invece di rinominarlo.
2. **Rinominarla in `service_type`** (fase 3) e tenerla come traccia storica di
   quale servizio aveva il nuotatore al momento del caricamento. Difendibile,
   ma allora va anche letta da qualche parte, altrimenti è la stessa cosa di
   prima con un nome migliore.
3. **Lasciarla com'è.** Sconsigliato: è esattamente il caso che l'audit chiama
   trappola — chi legge `race_videos.tier` credendo di leggere un livello di
   accesso ottiene un tipo di servizio, e sbaglia.

Serve la tua scelta prima di scrivere la DDL. Se la risposta è 1, la fase 4 è
di nuovo rischio zero.

---

## 5 · I due profili incoerenti, con i numeri

La distribuzione incrociata dei 17 nuotatori (il diciottesimo profilo è il
coach):

| `profiles.tier` | `profiles.service_type` | `payment_status` | Nuotatori | Lettura |
|---|---|---|---|---|
| `free` | `both` | — | 1 | **incoerente** |
| `free` | `coaching_1_1` | — | 1 | **incoerente** |
| `free` | `open` | `pending_payment` | 1 | coerente, attivazione in corso |
| `free` | `open` | — | 8 | coerente |
| `one_to_one` | `coaching_1_1` | `paid` | 3 | coerente |
| `open` | `open` | `paid` | 1 | coerente |
| `open_plus` | `open` | `paid` | 2 | coerente, per costruzione |

I due profili `free` con servizio 1:1 sono quelli che il commento in
`src/lib/access.ts:99-109` descrive: nessun pagamento, ma `plan_entitlements`
li fa risultare `remote_allowed = true`, perché l'entitlement è indicizzato
sull'asse B. **Oggi non è una falla**: `canBookRemote` passa da `accessTier`, e
quindi dal livello di accesso reale, e li blocca. La falla si aprirebbe il
giorno in cui qualcuno leggesse `plan_entitlements` direttamente — che è
precisamente la cosa che l'audit chiede di rendere impossibile.

Le due righe `open_plus` con `service_type = 'open'` non sono un errore: Open+ è
un livello del canale, il tipo di servizio resta Open. È il caso che dimostra
che i due assi sono davvero due, e che non vanno fusi.

**Cosa NON propongo.** Non propongo di correggere i due profili. Non so se sono
prove, omaggi o errori di inserimento, e cambiare il `tier` di una persona ha
effetti sul suo accesso e sul suo gate di pagamento. La vista
`v_tier_coherence` della fase 2 li mette sotto gli occhi del coach ogni volta
che guarda; la correzione è una sua decisione, da fare dall'interfaccia.

---

## 6 · Cosa resta a te

1. **Fase 3, 3a o 3b.** La mia raccomandazione è 3a.
2. **Fase 4**: `race_videos.tier` si depreca, si rinomina o resta. Raccomando
   di deprecarla.
3. **I due profili `free` con servizio 1:1**: cosa sono, e se il `tier` va
   alzato o il `service_type` va abbassato.
4. **`subscriptions`**: se e quando cancellarla. Non prima che il dossier
   legale confermi che `withdrawal_waived_at` non serve più come forma.
