-- ============================================================
-- GLIDE — migration_012_revoke_public_execute.sql
-- Chiude i WARN advisor "Public/Signed-in can execute SECURITY DEFINER function".
-- La 009 revocava da anon/authenticated, ma l'EXECUTE è ereditato da PUBLIC:
-- quelle revoche erano di fatto no-op. Qui si revoca dal grant giusto (PUBLIC).
-- ============================================================

-- handle_new_user è SOLO un trigger su auth.users: gira nel contesto del
-- trigger a prescindere dai grant, quindi nessun ruolo deve poterla chiamare
-- via RPC. Revocando da PUBLIC spariscono anche anon e authenticated (che la
-- ereditavano) → i due WARN su questa funzione si chiudono.
revoke execute on function public.handle_new_user() from public;

-- NB: is_coach() NON viene revocata da PUBLIC, di proposito.
-- È richiamata da 20 policy RLS 'to public' su tabelle con grant ad anon
-- (profiles, workouts, readiness, transactions, ...): in Postgres una funzione
-- usata in una policy richiede EXECUTE al ruolo che interroga, quindi togliere
-- il PUBLIC farebbe fallire quelle chiamate con "permission denied for function
-- is_coach". La funzione ritorna solo un booleano sul chiamante (nessun dato
-- esposto), perciò il WARN residuo "authenticated can execute is_coach" è
-- accettato come innocuo e voluto.
