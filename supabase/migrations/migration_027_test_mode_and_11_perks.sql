-- ============================================================
-- GLIDE — migration_027_test_mode_and_11_perks.sql  (Onda 19)
--
-- 1) MODALITÀ TEST (togglabile): finché attiva, ogni nuovo nuotatore che si
--    registra ottiene accesso pieno al Canale Open (tier = 'open_plus').
--    Si spegne cambiando app_config.test_mode → i nuovi tornano 'free'.
-- 2) PERK 1:1: il token "lezione inclusa" mensile è agganciato al SERVIZIO 1:1
--    (service_type in coaching_1_1 / both), non più solo al tier one_to_one,
--    così anche chi ha "1:1 + Open" lo riceve. Backfill immediato incluso.
--
-- NB terminologia: il "token lezione" e l'upload video incluso sono servizi
-- DENTRO l'abbonamento 1:1. La *videoanalisi* è un evento in agenda separato,
-- a pagamento (coupon dedicati): non c'entra con questa migration.
-- ============================================================

-- --- 1) Config applicazione + funzione test_mode() ---------------------------
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

-- Lettura libera (è solo un flag, nessun dato sensibile); scrive solo il coach.
drop policy if exists "app_config: lettura" on public.app_config;
create policy "app_config: lettura" on public.app_config
  for select to public using (true);

drop policy if exists "app_config: scrive il coach" on public.app_config;
create policy "app_config: scrive il coach" on public.app_config
  for all to public using (public.is_coach()) with check (public.is_coach());

-- Modalità test ATTIVA di default (siamo in fase di test).
insert into public.app_config (key, value)
values ('test_mode', 'true'::jsonb)
on conflict (key) do nothing;

create or replace function public.test_mode()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select value = 'true'::jsonb from public.app_config where key = 'test_mode'),
    false);
$$;
revoke execute on function public.test_mode() from public;
grant execute on function public.test_mode() to authenticated, anon, service_role;

-- --- 2) handle_new_user: tier iniziale secondo la modalità test --------------
-- Identica alla versione base, ma imposta il tier: 'open_plus' in modalità
-- test (accesso pieno al Canale Open), altrimenti 'free' come prima.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, first_name, last_name, tier)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'first_name',''),
          coalesce(new.raw_user_meta_data->>'last_name',''),
          case when public.test_mode() then 'open_plus' else 'free' end);
  return new;
end; $$;

-- --- 3) grant_monthly_tokens: aggancia al SERVIZIO 1:1 -----------------------
-- Prima accreditava solo a tier='one_to_one'. Ora anche a chi ha il servizio
-- 1:1 (coaching_1_1) o combinato (both), indipendentemente dal tier di accesso
-- al Canale Open. 1 solo token/mese, scade a fine mese, niente accumulo.
create or replace function public.grant_monthly_tokens()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into public.lesson_tokens (swimmer_id, source, expires_at)
  select p.id, 'mensile',
         (date_trunc('month', now()) + interval '1 month' - interval '1 second')
  from public.profiles p
  where (p.service_type in ('coaching_1_1','both') or p.tier = 'one_to_one')
    and not exists (
      select 1 from public.lesson_tokens t
      where t.swimmer_id = p.id
        and t.source = 'mensile'
        and t.granted_at >= date_trunc('month', now())
    );
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.grant_monthly_tokens() from public;

-- --- 4) Backfill: 1 token mensile ai 1:1 già esistenti (idempotente) ---------
select public.grant_monthly_tokens();
