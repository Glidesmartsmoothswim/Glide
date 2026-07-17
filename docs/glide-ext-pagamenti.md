# GLIDE — Estensione · Lezione 1-a-1 con pagamento diretto

> Estende `glide-ext-booking.md`. Vincoli: ADR-010, ADR-011.
> Non riscrive il booking: aggiunge la modalità `cash` a ciò che esiste già.

---

## 1. Cosa esiste già (non toccare)

`glide-ext-booking.md` ha già:
- la lezione 1-a-1 come servizio (`pool_60`, `pool_30`, `call_60`, `call_30`)
- lo slot engine, l'anti-overlap, la disdetta con finestra
- tre stati di pagamento: `credit`, `paid`, `pending`, `free`
- il listino prezzi in `services.price_cents`

**Questa estensione aggiunge un solo metodo: `cash`.** Il resto resta identico.

---

## 2. Modifica DB

```sql
-- La colonna payment esistente distingue lo STATO. Aggiungiamo il METODO e il tracciamento cassa.
alter table public.bookings
  add column payment_method text not null default 'credit'
    check (payment_method in ('credit','stripe','cash','free')),
  add column payment_status text
    check (payment_status in ('da_incassare','incassato')),   -- valorizzato solo se method='cash'
  add column amount_cents   int,          -- dovuto, copiato da services al momento della prenotazione
  add column receipt_number text,         -- n° ricevuta/fattura — lo compila il coach, opzionale
  add column paid_at        timestamptz;  -- quando il coach segna incassato

-- Integrità: se è contante, deve avere uno stato di cassa. Se non lo è, non deve averlo.
alter table public.bookings add constraint cash_needs_status check (
  (payment_method = 'cash'  and payment_status is not null) or
  (payment_method <> 'cash' and payment_status is null)
);
```

Nessun campo per "occultare". `payment_status` ha due soli valori, entrambi contabili (ADR-010).

---

## 3. Flusso di prenotazione

Al momento della scelta servizio, dopo aver verificato che non ci sono crediti disponibili:

```
Hai crediti?  → sì  → payment_method='credit'   (invariato)
              → no  → il nuotatore sceglie:

   [ Paga ora online ]        → stripe   → Checkout → 'paid' al webhook   (invariato)
   [ Paga in vasca col coach ]→ cash     → booking creato, payment_status='da_incassare'
```

**Chi controlla cosa (ADR-008):** il metodo lo propone la UI, ma **lo stato di cassa lo scrive
solo il server**, e il passaggio `da_incassare → incassato` è **azione riservata al coach**.
Un nuotatore non può marcarsi "incassato" da solo — è un `update` che la RLS gli nega.

Testo per il nuotatore, sobrio (GLIDE_VOICE.md):
> *"Prenotazione confermata. Il pagamento (€50) lo sistemi direttamente con Alessio in vasca."*

Nessuna enfasi, nessuna ambiguità. Il nuotatore sa quanto deve e a chi.

---

## 4. Lato coach — il registro di cassa

Nella card prenotazione dell'Agenda, quando `payment_method='cash'`:

- badge **"Da incassare · €50"** in navy (non rosso: non è un errore, è un promemoria)
- a lezione svolta, un tap: **"Segna incassato"** → `payment_status='incassato'`, `paid_at=now()`
- campo opzionale **n° ricevuta**, se il coach ne emette una

Vista dedicata **"Cassa"** (tab nell'Agenda): elenco `da_incassare`, totale, filtro per periodo.
È lo strumento che, a fine mese, il coach guarda per sapere cosa portare al commercialista.

---

## 5. Nel digest (ADR-011)

Sezione § I NUMERI del digest del lunedì:

> *"3 lezioni da incassare · €130 · la più vecchia è di 12 giorni fa"*
> → tap: apre la vista Cassa

Il contante si dimentica. Senza questa riga, la modalità `cash` fa perdere soldi veri al coach.
Con questa riga, è un registro che lavora per lui.

---

## 6. Nel ledger (se attivo)

```
booking.created    { ..., payment_method: 'cash' }
payment.collected  { booking_id, amount_cents, method: 'cash' }   ← quando il coach segna incassato
```

Mai l'importo nei payload destinati a derivare gamification. Il denaro non è un punteggio,
e non entra mai nel Glide Score. (ADR-005: nessuna metrica di gioco legata a pagamenti.)

---

## 7. Confine — da tenere fuori dal codice e dai documenti

GLIDE traccia gli incassi. **Non** implementa, etichetta o suggerisce l'occultamento di ricavi.
La conformità fiscale (ricevuta, dichiarazione, regime forfettario) è del coach e del suo
commercialista. Lo strumento è neutro e tracciante per costruzione: è la forma che protegge
il coach, non quella che lo espone.

---

## 8. Collaudo

- [ ] Nessun credito → compaiono le due opzioni: online e diretto
- [ ] `cash` → booking creato con `payment_status='da_incassare'`, `amount_cents` dal listino
- [ ] Il nuotatore **non** può cambiare `payment_status` (la RLS glielo nega) — provalo e mostralo
- [ ] "Segna incassato" → `incassato` + `paid_at`, solo dal coach
- [ ] Il constraint `cash_needs_status` rifiuta un `cash` senza stato e un `credit` con stato
- [ ] La vista Cassa somma correttamente i `da_incassare` del periodo
- [ ] Il digest del lunedì riporta il totale in sospeso
- [ ] Stripe non configurato → l'opzione online si nasconde, resta solo il diretto. Nessun crash
