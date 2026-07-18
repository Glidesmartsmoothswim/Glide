# GLIDE — Video: cancellazione & retention · Programmazione 1:1 (spec v0.1)

> **Stato:** documento di lavoro, non vincolante.
> **Vincoli ereditati:** C-5 (bucket privato, signed URL), ADR-003 (event ledger), ADR-004 (nessun contenuto sensibile nei payload), G-9 (retention definita + auto-purge — questa spec la implementa per i video), "AI legge e segnala, mai modifica il carico".

---

# PARTE 1 — Cancellazione video da parte dell'utente

## 1.1 Regola

Il nuotatore può cancellare **i propri** video. Sempre, senza chiedere al coach. È il suo corpo ripreso: la cancellazione è anche un diritto GDPR (Art. 17), non solo una feature.

## 1.2 Comportamento

| Stato del video | Cancellazione | UI |
|---|---|---|
| Caricato, non ancora analizzato | immediata | conferma semplice: "Elimino il video. Non si recupera." |
| In coda coach | immediata + rimozione dalla coda | idem |
| Analizzato (commenti presenti) | consentita, con avviso | "Il coach l'ha già commentato. Cancello il video; i commenti testuali restano nel tuo storico." |
| Open, analisi pagata (€5) | consentita, con avviso | "Hai pagato l'analisi di questo video. Cancellandolo non c'è rimborso." |

- **Il video sparisce, il testo resta.** I commenti del coach sono note testuali agganciate alla sessione: sopravvivono al purge del file. Nessun re-upload "per rivedere cosa aveva detto il coach".
- Il coach può cancellare qualsiasi video dei propri nuotatori (pulizia coda).

## 1.3 Meccanica (due fasi, mai delete diretto dal client)

1. **Soft delete** — `videos.status = 'deleted'`, `deleted_at = now()`. Il video sparisce da ogni vista e da ogni signed URL (la route di viewUrl controlla lo status). Finestra di ripensamento: **7 giorni**, con "Annulla" visibile nella scheda.
2. **Hard delete** — cron giornaliero (protetto da `CRON_SECRET`): per ogni riga `deleted` da >7 giorni → `DeleteObjectCommand` su R2 → cancella la riga DB.

- L'API `/api/video/delete` verifica ownership server-side (`user_id = auth.uid()` o coach del nuotatore). Mai delete R2 dal browser.
- Evento ledger: `video.deleted` con payload `{by: 'swimmer'|'coach', had_analysis: bool}`. Nessun filename, nessun contenuto.

---

# PARTE 2 — Retention: volume video sul cloud

## 2.1 Premessa sui costi (perché la scelta è organizzativa, non economica)

R2: ~**€0,014/GB/mese**, zero egress. 50 nuotatori × 10 video/stagione × 200 MB = 100 GB ≈ **€1,50/mese**. Il costo non è il problema. I problemi veri sono due:
1. **GDPR** — video = persone identificabili. "Li teniamo per sempre" non è una retention policy difendibile (G-9).
2. **Usabilità** — una coda con 400 video vecchi seppellisce quelli nuovi.

## 2.2 Decisione consigliata: **retention agganciata al macrociclo, non alla data**

Il reset "a stagione" (data fissa) è cieco: un nuotatore che inizia a marzo si vede purgare a settembre video di 6 mesi, uno che inizia ad agosto perde video di 1 mese. Il macrociclo (Parte 3) dà il confine naturale: *il video serve finché serve al ciclo di lavoro che documenta*.

**Ciclo di vita:**

```
attivo ──(chiusura macrociclo)──▶ archiviato ──(+90 giorni)──▶ purge
                                      │
                                 [Preserva ✦]──▶ conservato (max 3/nuotatore)
```

- **Attivo**: macrociclo in corso. Visibile ovunque.
- **Archiviato**: alla chiusura del macrociclo (azione del coach, mai automatica). Sparisce dalla coda e dalla home; resta consultabile in "Archivio" nella scheda nuotatore. Notifica in-app al nuotatore: *"Ciclo chiuso. I video di questo blocco si cancellano tra 90 giorni. Scarica o preserva quelli che vuoi tenere."* (email = notifica, non contiene dettagli).
- **Purge**: cron mensile cancella gli archiviati scaduti. R2 + DB. I commenti testuali del coach restano (§1.2).
- **Preserva ✦**: nuotatore o coach marcano fino a **3 video per nuotatore** come permanenti (il "prima/dopo" della tecnica, la gara migliore). Il limite tiene il sistema pulito; è alzabile per gli Elite se vorrai farne un plus di tier.
- Fallback per chi non ha macrocicli (Open, non agonisti): retention a tempo, **12 mesi dall'upload**, stesso flusso archivio→90gg→purge.

**Parametri in configurazione** (`lib/retention.ts`, non hardcoded): giorni di grazia (90), max preservati (3), retention Open (365). Li tari senza toccare la logica.

## 2.3 Cosa NON fare

- Nessun purge senza preavviso e finestra di download.
- Nessuna cancellazione automatica dei video "preservati", mai.
- Nessun reset a data fissa uguale per tutti.

---

# PARTE 3 — Parametri di programmazione (1:1)

## 3.1 Scopo

Il coach definisce, per ogni nuotatore individualizzato, la cornice del lavoro: quando inizia, quando finisce, verso cosa punta. La cornice è **del coach**: l'AI la legge (per contestualizzare i segnali del digest), non la tocca. Il nuotatore la vede come orizzonte, non come pannello modificabile.

## 3.2 Modello

```sql
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  swimmer_id uuid not null references public.profiles(id),
  coach_id uuid not null,
  title text not null,                    -- "Preparazione Regionali 2027"
  start_date date not null,
  end_date date not null,
  status text not null default 'draft'
    check (status in ('draft','active','closed')),
  -- gara obiettivo (opzionale: un programma può puntare a forma, non a gara)
  goal_race_name text,                    -- "Campionati Regionali Master"
  goal_race_date date,
  goal_race_pool int check (goal_race_pool in (25,50)),
  goal_events text[],                     -- ['100 SL','200 SL']
  goal_time_target text,                  -- indicativo, testo libero del coach
  notes text,                             -- visibili solo al coach
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create table if not exists public.program_phases (   -- macro/mesocicli
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,                     -- "Aerobico" / "Specifico" / "Tapering"
  phase_type text not null
    check (phase_type in ('generale','specifico','gara','tapering','scarico','transizione')),
  start_date date not null,
  end_date date not null,
  focus text                              -- una riga: cosa si costruisce in questo blocco
);
```

RLS: coach full sui propri nuotatori; nuotatore **select-only** sul proprio programma `active` (mai `notes`, mai i `draft`). Un solo programma `active` per nuotatore (unique parziale).

## 3.3 UI Coach (gestionale)

Scheda nuotatore → tab **Programmazione**:
- Form programma + timeline orizzontale delle fasi (barre colorate su asse temporale, palette zone esistente per phase_type — nessun colore nuovo)
- Le fasi si disegnano in sequenza; validazione: nessun buco, nessuna sovrapposizione
- `Chiudi programma` → status `closed` → **trigger dell'archiviazione video** (§2.2) + proposta: "Duplica come base del prossimo ciclo"
- Il digest lunedì mostra la fase corrente accanto a ogni nuotatore 1:1: *"Marco · Specifico, sett. 3/5 · gara tra 34 giorni"* — contesto per leggere la readiness (una fisica bassa in tapering pesa diversamente che in generale)

## 3.4 UI Nuotatore (PWA)

Card in home, sola lettura, sobria:
> **Verso i Regionali** · fase: Specifico
> Gara tra **34 giorni** — 14 marzo, vasca 25
- Nessun conto alla rovescia ansiogeno (niente rosso — ADR-005), nessun obiettivo cronometrico esposto se il coach non compila `goal_time_target`
- I video caricati durante il programma si taggano automaticamente `program_id` + fase → è questo che rende possibile la retention del §2.2 e il confronto "stesso esercizio, fase generale vs specifica"

## 3.5 Collaudo

- [ ] Nuotatore cancella un proprio video → sparisce ovunque, "Annulla" funziona per 7 giorni, poi il file non è più su R2 (403 anche con vecchio signed URL)
- [ ] Commenti del coach visibili dopo il purge del video
- [ ] Chiusura programma → notifica, archivio, purge a +90gg; i ✦ sopravvivono
- [ ] Nuotatore non vede `notes` né programmi `draft` (test RLS, non solo UI)
- [ ] Due fasi sovrapposte → validazione blocca il salvataggio
- [ ] Digest mostra fase e giorni-a-gara corretti
