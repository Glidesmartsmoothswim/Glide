-- ============================================================
-- GLIDE — migration_045_lesson_token_redeemable_for.sql (Sprint C.1, ADR-015)
-- Estende lesson_tokens a group_lesson (oltre a private_lesson). Il redeem
-- (reserve_lesson_token) filtra ora per tipo: un token privato non può
-- coprire una lezione di gruppo e viceversa.
-- link_lesson_token/release_lesson_token/grant_monthly_tokens NON toccate:
-- il DEFAULT 'private_lesson' sulla nuova colonna copre già il caso mensile.
-- ============================================================

alter table public.lesson_tokens
  add column redeemable_for text not null default 'private_lesson'
  check (redeemable_for = ANY (ARRAY['private_lesson'::text, 'group_lesson'::text]));

create or replace function public.reserve_lesson_token(p_swimmer uuid, p_type text default 'private_lesson')
returns uuid language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  if auth.role() is distinct from 'service_role'
     and (auth.uid() = p_swimmer or public.is_coach()) is not true
  then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update public.lesson_tokens
     set redeemed_at = now()
   where id = (
     select id from public.lesson_tokens
      where swimmer_id = p_swimmer
        and redeemed_at is null
        and redeemable_for = p_type
        and (expires_at is null or expires_at > now())
      order by expires_at nulls last, granted_at
      limit 1
      for update skip locked
   )
   returning id into tid;
  return tid;
end $$;
