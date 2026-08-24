# PROMPT S-5 — Hardening post-audit live (24/8/2026)

Continua la numerazione di `PROMPT_CODE_SEC.md` (S-0…S-4). Due fix, basso rischio, entrambi verificati come necessari da query dirette sul DB — non da ipotesi.

```
VINCOLI PER QUESTA SESSIONE — leggi prima di qualunque cosa.

NON devi:
- toccare EXECUTE su is_coach(), my_tier(), test_mode(): sono SECURITY DEFINER
  chiamate DA DENTRO le policy RLS stesse. Se revochi EXECUTE da anon/authenticated
  su queste tre, rompi ogni policy che le usa. Sono "pubbliche" per design, non un bug.
- toccare la policy "profili: modifica propria o coach" (bypass di is_coach()):
  è una decisione di tenancy che aspetta un ADR, non un fix di sicurezza da automatizzare.
- droppare o rinominare funzioni esistenti.
- applicare fix fuori dal ledger migrazioni (niente SQL Editor a mano).

DEVI:
- scrivere un TEST per ogni fix che fallisca se il fix viene rimosso.
- applicare come migration tracciata.

MODALITÀ AUTONOMA.

=== FIX C-6: EXECUTE su token RPC ancora aperto ad anon ===
PROBLEMA: link_lesson_token, release_lesson_token, reserve_lesson_token hanno già
il check di ownership interno (verificato: funziona), ma restano chiamabili anche
da anon via /rest/v1/rpc/. Nessun caso d'uso legittimo pre-login le richiede.

Migration `migration_0XX_revoke_anon_lesson_token_rpc.sql`:

  revoke execute on function public.link_lesson_token(uuid, uuid)    from anon;
  revoke execute on function public.release_lesson_token(uuid)       from anon;
  revoke execute on function public.reserve_lesson_token(uuid)       from anon;

  -- authenticated NON va toccato: gli swimmer autenticati devono continuare a chiamarle.

TEST OBBLIGATORIO (test/security/lesson-token-anon-execute.test.ts):
- una chiamata RPC come anon a una delle tre funzioni deve fallire con 401/403
  per mancanza di permessi (non deve nemmeno arrivare al controllo ownership interno)
- una chiamata come authenticated (swimmer sul proprio token) deve continuare a funzionare
- il test deve fallire se il revoke viene rimosso o se qualcuno ri-concede EXECUTE ad anon

=== FIX C-7: zone_rpe_bands leggibile anche da anon ===
PROBLEMA: la policy "bands_read" su public.zone_rpe_bands usa using(true) senza
restrizione di ruolo. La mappatura Z1-Z5/RPE del protocollo è interrogabile via
GET /rest/v1/zone_rpe_bands da chiunque, anche senza login. È metodologia interna,
non contenuto customer-facing: non deve essere pubblica.

Migration `migration_0XX_zone_rpe_bands_authenticated_only.sql`:

  drop policy if exists bands_read on public.zone_rpe_bands;

  create policy bands_read on public.zone_rpe_bands
    for select
    to authenticated
    using (true);

  -- bands_write resta invariata (già scoping is_coach()).

TEST OBBLIGATORIO (test/security/zone-bands-anon-read.test.ts):
- una select come anon su zone_rpe_bands deve restituire 0 righe / 401, non i dati
- una select come authenticated (swimmer o coach) deve continuare a funzionare

Al termine: aggiorna STATO.md e SECURITY_AUDIT.md con lo stato di C-6 e C-7,
commit "sec: revoke anon execute su lesson-token RPC (C-6), restrict zone_rpe_bands a authenticated (C-7)".
```

### ✅ CHECKLIST TUA — prima ancora di lanciare questo prompt

Questi due non sono codice, sono dashboard, e vengono prima di tutto il resto:

- [ ] **MFA sull'account coach** (`glide.smartswim@gmail.com`) — Supabase Dashboard → Authentication → Users → abilita TOTP. *(B-1, vedi `GLIDE_SECURITY_AUDIT_v2.md` §1)*
- [ ] **Leaked Password Protection** — Dashboard → Authentication → Policies → Password Security → attiva + minimo 10 caratteri. *(B-2)*

### ✅ CHECKLIST TUA — dopo S-5

- [ ] Verifica che la prenotazione/riscatto lezione funzioni ancora per uno swimmer autenticato reale
- [ ] Verifica che `/rest/v1/zone_rpe_bands` senza header `Authorization` restituisca vuoto/errore

---

## Cosa resta fuori da questo prompt (non è codice, è tuo)

| Finding | Cosa manca | Rif. |
|---|---|---|
| **C-8** Coach bypass totale su UPDATE profiles | ADR di tenancy multi-coach | `GLIDE_SECURITY_AUDIT_v2.md` §3 |
| **C-4** service_role in bundle client | Grep manuale o richiesta separata a Code | `GLIDE_SECURITY_AUDIT_v2.md` §3 |
| Backup/restore Supabase Pro | Conferma piano + restore di prova | `GLIDE_SECURITY_AUDIT_v2.md` §3 |
| DPIA, consensi, DPA processor | Tu + legale | `GLIDE_SECURITY_AUDIT_v2.md` §4 |

---
*Prima si mette in sicurezza la vasca, poi ci si nuota dentro.*
