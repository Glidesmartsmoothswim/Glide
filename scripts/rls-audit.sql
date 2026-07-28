-- Audit RLS (S-2). Restituisce le tabelle di public che NON sono a posto:
--   a) RLS disattivata
--   b) RLS attiva ma senza NESSUNA policy (di solito un bug, non una scelta)
-- Zero righe = tutto ok. Esegui nel SQL editor Supabase o via MCP.
select c.relname as tabella,
       case
         when not c.relrowsecurity then 'RLS DISATTIVA'
         else 'RLS ATTIVA, ZERO POLICY'
       end as problema
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and (
    c.relrowsecurity = false
    or not exists (select 1 from pg_policy p where p.polrelid = c.oid)
  )
order by c.relname;
-- Esito atteso oggi (verificato in S-0): NESSUNA riga.
