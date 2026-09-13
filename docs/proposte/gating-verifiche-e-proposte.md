# GLIDE — Sessione A: verifiche riportate e proposte non applicate

**Risposta a:** `PROMPT_CODE_GATING.md`, Sessione A
**Data:** 13 settembre 2026
**Livello:** Supervised.

> **Aggiornamento 13/09/2026, sera.** Questo documento è nato quando le
> migrazioni erano proposte da non eseguire. Su indicazione del committente —
> l'esecuzione manuale non è disponibile — **sono state applicate al database
> di produzione**, nell'ordine `053` → `059` → `060` → `061` → `062` → `063`,
> una per volta e con verifica dopo ciascuna. L'esito sta in §5.
> Nessuna cancellazione è stata eseguita: Matteo B è intatto.

---

## 1 · I tre punti da verificare e riportare

### 1.1 — Dove sta oggi il gate del builder (A2)

**Nel codice applicativo, in due strati, e funziona.**

| Strato | File | Cosa fa |
|---|---|---|
| Server action | `src/app/app/nuoto/self-actions.ts:createSelfWorkout` | `if (!canAccess(accessTier(profile), "open:self")) return { error: ... }` — rifiuta prima di scrivere |
| UI | `src/app/app/nuoto/page.tsx` | `canAccess(tier, "open:self")` decide se montare il builder |

`ACCESS_MATRIX` (`src/lib/access.ts`) concede `open:self` a `['open','open_plus']`.
`accessTier` passa anche dal gate di pagamento, quindi un Open scaduto decade a
`free` e perde il builder.

**La policy permissiva non è quindi un buco sfruttabile dall'app.** Per passare
di lì bisogna chiamare PostgREST a mano col proprio JWT, dove nessun `if` in
TypeScript può fermarti. È la stessa forma del difetto di ADR-018/migration_058:
un controllo che esiste in un solo strato non è un controllo, è una consuetudine.
`migration_060` lo chiude anche sotto.

**Una discrepanza da decidere.** Il prompt chiede `open`, `open_plus`,
`one_to_one`; `access.ts` concede `open:self` solo a `open`/`open_plus`, perché
il percorso 1:1 ha la programmazione scritta dal coach. La policy proposta segue
il prompt ed è quindi un filo più larga dell'app — va bene per un backstop
(l'app resta la regola più stretta, l'effetto pratico oggi è Open/Open+), ma le
due vanno riallineate quando si decide se il 1:1 debba avere il builder.
Entrambe le letture tengono `free` fuori, che è il punto.

### 1.2 — Il limite reale del bucket `race-videos` (A4.1 §6)

**Verificato in produzione:**

| Campo | Valore reale |
|---|---|
| `file_size_limit` | **`NULL`** |
| `allowed_mime_types` | **`NULL`** |

**`migration_053` non risulta applicata.** Quel file fa esattamente
`update storage.buckets set file_size_limit = 524288000, allowed_mime_types =
array['video/*'] where id = 'race-videos'` — e in produzione entrambi i campi
sono nulli. O non è mai stata eseguita, o qualcosa l'ha sovrascritta dopo.

Con il bucket a `NULL` vale il **limite globale del progetto**, che il
piano Supabase fissa di default a **50 MB**. L'app invece accetta fino a
**500 MB** (`VIDEO_MAX_BYTES` in `src/lib/video.ts`, e i controlli
nell'uploader e in `registerVideo`).

**È una forbice di 450 MB fra ciò che l'app promette e ciò che lo storage
accetta**, e combacia con i record senza file:

- **7 record senza `storage_path`**, non 5.
- **6 dei 7** sono dello stesso nuotatore, lo stesso giorno (19/07/2026), sullo
  stesso evento ("100 dorso"): la firma di un caricamento ritentato più volte.

Un video di gara girato col telefono sta comodamente fra i 50 e i 500 MB: passa
la validazione del browser, parte, e muore contro il limite globale. Il
nuotatore vede fallire senza capire perché.

**RISOLTO il 13/09/2026** (aggiornamento). Il committente ha chiarito che **il
tetto globale di 50 MB non è alzabile**: il progetto sta sul piano Free. Quindi
la strada non era alzare lo Storage, era smettere di promettere 500 MB.

1. **`migration_053` riscritta e applicata**: il bucket dichiara ora
   `file_size_limit = 52428800` (50 MB) e `allowed_mime_types = {video/*}` —
   il tetto vero, non uno che non può avere effetto. Verificato in produzione.
2. **L'app allineata a 50 MB** (`VIDEO_MAX_BYTES` in `src/lib/video.ts`).
3. **Compressione lato client** (`src/lib/video-compress.ts`): 50 MB per un
   video girato col telefono è poco, quindi l'app non si limita a respingere —
   ridimensiona a 720p e ricomprime con `MediaRecorder` prima di caricare,
   puntando al 90% del tetto. Due costi, entrambi dichiarati nella UI: è in
   tempo reale (comprimere due minuti richiede due minuti) e l'audio si perde.
   Fallisce morbido: se il browser non la supporta si carica l'originale e, se
   non ci sta, il messaggio dice quanto pesa, quanto può pesare e **cosa fare**.

Va ancora deciso cosa fare dei 7 record orfani: sono righe che puntano a un file
che non esiste. Non li ho toccati.

### 1.3 — Cosa si porta dietro il profilo di Matteo B (A5)

`d3bfb713-cdb1-43c0-8775-2f39e6b356d5` · iscritto 12/07/2026 · `free` ·
`service_type = coaching_1_1` · nessun pagamento · **termini e privacy mai
accettati**.

Conteggio su tutte e 20 le tabelle che referenziano `profiles`:

| Tabella | Righe |
|---|---|
| `glide_scores` | **8** |
| tutte le altre 19 | **0** |

Zero prenotazioni, zero transazioni, zero video, zero allenamenti, zero
readiness, nessun questionario, nessun primato, nessun token, nessun pacchetto.
**Nessun dato contabile e nessun contenuto.**

**Cosa verrebbe eliminato da una cancellazione**, se decidesse di procedere:

- il profilo stesso;
- le **8 righe di `glide_scores`**, via `on delete cascade`, in silenzio;
- **l'utente in `auth.users` resta**: `profiles` non lo porta con sé. Va
  rimosso a parte dall'API admin di Supabase, altrimenti resta un account
  capace di autenticarsi senza profilo.

**Non ho cancellato nulla**, come da istruzioni. La decisione è sua.

Nota: 8 `glide_scores` su un profilo che non ha mai nuotato significa che il
calcolo del punteggio gira anche su profili senza attività. Non è un problema
di questo lavoro, ma è un dato che vale la pena sapere — e che tocca il punto 2
delle decisioni aperte in `GLIDE_AUDIT_COERENZA.md` §9.

---

## 2 · A3 — Il controllo di coerenza fra i due assi, da proporre

La correzione al codice è **applicata** (vedi §3): `markPaid` scrive ora
entrambi gli assi. Qui sta il presidio in database, che resta una proposta.

La vista `v_tier_coherence` è già descritta in
`docs/proposte/tier-vocabolario.sql`, fase 2. Rispetto a quella versione serve
una correzione, emersa da A5: **deve escludere i profili di test**, altrimenti
Chiara C. (free con `service_type = 'both'`, profilo di prova da conservare)
resta lì a segnalare per sempre un'incoerenza voluta.

```sql
-- Da aggiungere alla WHERE di v_tier_coherence quando la si applica:
  and not p.is_test
```

**Perché una vista e non un vincolo.** Un `CHECK` fra `tier` e `service_type`
rifiuterebbe la scrittura — e il primo a sbatterci sarebbe proprio il coach che
sta correggendo a mano un profilo già incoerente, bloccandogli la via d'uscita.
Un vincolo è giusto quando lo stato illecito non deve mai esistere; qui esiste
già, su due profili reali, e va prima sanato. La vista lo mette sotto gli occhi
al momento giusto senza chiudere porte.

Se in futuro si vuole il vincolo, la sequenza corretta è: vista → sanare i
profili → `alter table ... add constraint ... not valid` → `validate constraint`.

---

## 3 · Cosa è stato invece applicato al codice (non al database)

| Punto | File | Esito |
|---|---|---|
| A3 | `src/lib/payment/pricing.ts` | nuova `serviceTypeFor(tier, current)` |
| A3 | `src/lib/payment/request.ts` | `markPaid` scrive `tier` **e** `service_type` |
| A3 | `src/lib/payment/pricing.test.ts` | 4 test di regressione sull'incidente del 12/09 |
| A4.1 | `src/lib/birra.ts`, `src/components/video/birra-panel.tsx` | partita aperta, tre stati |
| A4.1 | `src/app/coach/video/actions.ts` | `segnaBirraDovuta` · `chiudiBirra` · `offriBirra` |
| A4.1 | `src/app/app/video/actions.ts`, `page.tsx` | paywall rimosso, `unlockVideo` eliminata |
| A4.1 | `src/lib/video.ts` | `BIRRA_CENTS` rimosso, `'locked'` fuori dal tipo |
| A4.1 | `src/lib/booking/modes.ts` | il listino non può finire fra i prenotabili |
| A1 | `src/app/app/libreria/page.tsx` | la riga sui contenuti bloccati non compare a vuoto |

---

## 5 · Le migrazioni applicate, con esito verificato

Applicate il 13 settembre 2026 sul progetto `unsdbeliaunhhgnuefyz`, una per
volta, verificando lo stato del database dopo ciascuna prima di passare alla
successiva. Nessuna è fallita.

| # | Migrazione | Verifica fatta dopo | Esito |
|---|---|---|---|
| 053 | Limiti del bucket `race-videos` | `file_size_limit` = 52428800 (50 MB), `allowed_mime_types` = `{video/*}` | ✅ |
| 059 | Libreria per `visibility` | policy vecchia sparita, nuova con il `CASE` sui quattro livelli | ✅ |
| 060 | Builder non ai Base | `with check` contiene `my_tier() in (open, open_plus, one_to_one)` | ✅ |
| 061 | Colletta per la Birra | `birra` a 300c in listino · `birra_tab` + 2 policy · **0 video ancora `locked`** · `locked` fuori dal vincolo | ✅ |
| 062 | Call non prenotabili | `call_30` e `call_60` a `active = false`; restano 5 prenotabili | ✅ |
| 063 | Profilo di test | Chiara C. `is_test = true`; **Matteo B intatto**, `is_test = false` | ✅ |

Le sei compaiono ora in `list_migrations`. Nota che **`053` non figurava nello
storico precedente**: la conferma indipendente che non era mai stata applicata,
come il documento sosteneva prima di applicarla.

---

## 4 · Le decisioni che restano sue

1. ~~Il limite globale dello Storage va alzato a mano~~ — **chiuso**: non è
   alzabile (piano Free). Risolto abbassando l'app a 50 MB e comprimendo.
2. **I 7 record video senza file**: cancellarli o tenerli come traccia.
3. **Matteo B**: cancellare o no, sapendo che si portano via 8 `glide_scores` e
   che l'utente `auth.users` va rimosso a parte.
4. **Il builder al 1:1**: allineare `access.ts` alla policy o viceversa.
5. **Le lezioni di gruppo a 10 €** per 30, 45 e 60 minuti (A4.3): tre durate
   diverse allo stesso prezzo. Segnalato, non corretto — serve sapere se è voluto.
6. **La vetrina della libreria**: con `migration_059` i contenuti di livello
   superiore spariscono dall'elenco invece di comparire col lucchetto, e si
   perde l'invito all'upgrade in libreria. Se lo rivuole, la strada è esporre un
   conteggio aggregato, non riaprire la riga.
