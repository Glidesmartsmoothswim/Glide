-- ============================================================
-- GLIDE — migration_043_manual_payment_gate.sql  (ADR-014)
--
-- Stripe esce dal progetto: incasso manuale (bonifico/contanti) + gate ad
-- accesso a degrado progressivo sull'abbonamento. Estende il pattern
-- payment_status/da_incassare di ADR-010/migration_011 (finora scoped al
-- singolo booking 1:1) al livello ABBONAMENTO, su `profiles`.
--
-- Non tocca `stripe_events`/`subscriptions`/`transactions` — nessun DROP,
-- come da vincolo di sessione. Il webhook resta disattivato via codice
-- (route.ts → 410), non a schema.
-- ============================================================

alter table public.profiles
  -- Piano richiesto in attesa di conferma pagamento (nessun accesso finché
  -- payment_status non è 'paid'). Stessi valori di SubTier storico, meno
  -- 'open_water'/'elite' (legacy, mai più proponibili da qui).
  add column if not exists requested_tier text
    check (requested_tier in ('open','open_plus','one_to_one_monthly','one_to_one_season')),
  -- Stato della richiesta corrente. NULL = nessuna richiesta in corso (free,
  -- o un tier assegnato a mano dal coach senza flusso di pagamento — es. un
  -- one_to_one omaggio: resta attivo finché il coach non lo cambia).
  add column if not exists payment_status text
    check (payment_status in ('pending_payment','paid')),
  -- Metodo di incasso. Un solo valore possibile ora (ADR-014 rimuove la riga
  -- 'stripe' da ADR-010): 'cash' resta il pattern generico per ogni incasso
  -- fuori piattaforma (bonifico in primis, non solo contanti fisici).
  add column if not exists payment_method text
    check (payment_method in ('cash')),
  add column if not exists payment_amount_cents int,
  add column if not exists receipt_number text,
  add column if not exists paid_at timestamptz,
  -- Scadenza del periodo corrente. NULL = nessuna scadenza (free, o un tier
  -- assegnato a mano senza periodo — invariato rispetto a oggi). Il gate
  -- ad accesso (lib/payment/gate.ts) la legge SOLO per calcolare due/grace/
  -- overdue — mai un cron che stacca l'accesso da solo (ADR-014).
  add column if not exists tier_expires_at timestamptz,
  -- glide-ext-recesso.md §3: stessa prova server-side già raccolta per
  -- Stripe (migration_038, tabella `subscriptions`, ora non più scritta),
  -- qui per il flusso di richiesta attivazione manuale. Scritta SOLO dal
  -- server (mai passata dal client), come l'originale.
  add column if not exists withdrawal_waived_at timestamptz,
  add column if not exists withdrawal_waiver_ip_hash text;

comment on column public.profiles.withdrawal_waived_at is
  'ADR-014: prova server-side della rinuncia al recesso alla richiesta di attivazione (glide-ext-recesso.md §3), come subscriptions.withdrawal_waived_at (migration_038) per il flusso Stripe ormai dismesso.';

comment on column public.profiles.requested_tier is
  'ADR-014: piano richiesto con "Richiedi attivazione", in attesa che il coach segni pagato. NULL se nessuna richiesta pendente.';
comment on column public.profiles.payment_status is
  'ADR-014/ADR-010: pending_payment = richiesta creata, nessun accesso attivo; paid = incassato, tier attivo. NULL = nessun flusso di pagamento tracciato per il tier corrente (es. one_to_one assegnato a mano dal coach).';
comment on column public.profiles.tier_expires_at is
  'ADR-014: scadenza del periodo pagato corrente. Il gate (due/grace/overdue) si calcola SOLO a lettura, mai via cron che declassa da solo.';

-- Guardia (come profiles_tier_check/protect_tier_column, migration_019):
-- un client autenticato non deve poter auto-attivarsi un tier o auto-
-- marcarsi pagato scavalcando il coach.
create or replace function public.protect_payment_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if (
    new.payment_status is distinct from old.payment_status
    or new.tier_expires_at is distinct from old.tier_expires_at
    or new.paid_at is distinct from old.paid_at
    or new.receipt_number is distinct from old.receipt_number
    or new.payment_amount_cents is distinct from old.payment_amount_cents
  )
     and current_user in ('authenticated', 'anon')
     and not public.is_coach() then
    raise exception 'Modifica dello stato di pagamento non consentita.'
      using errcode = '42501';
  end if;
  -- requested_tier/payment_method: può scriverli anche il nuotatore stesso
  -- (crea la propria richiesta di attivazione via server action) — quella
  -- azione passa comunque dall'admin client (service_role), non dal client
  -- RLS-rispettoso, quindi current_user lì è 'postgres'/'service_role' e
  -- questo trigger non la blocca.
  return new;
end;
$$;
revoke execute on function public.protect_payment_columns() from public;

drop trigger if exists protect_payment_columns on public.profiles;
create trigger protect_payment_columns
  before update on public.profiles
  for each row execute function public.protect_payment_columns();
