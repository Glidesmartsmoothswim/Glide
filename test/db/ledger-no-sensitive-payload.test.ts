import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

/**
 * PROMPT_CODE_READINESS_V3_1.md §1bis — leak retroattivo nel ledger.
 *
 * `activity_events` è a conservazione ILLIMITATA (GLIDE_REGISTRO_TRATTAMENTI
 * §10): `corpo`/`health_flag` non ci devono MAI stare (dato sanitario),
 * né nelle righe storiche (migration_042, applicata il 26/08/2026 — 22 righe
 * corrette, verificato 0 rimaste) né in una riga nuova scritta oggi.
 *
 * Richiede un progetto Supabase reale raggiungibile (stesse env di
 * readiness-schema.test.ts): salta pulito senza NEXT_PUBLIC_SUPABASE_URL/
 * SUPABASE_SERVICE_ROLE_KEY configurate, invece di fallire.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isPlaceholder = (v: string | undefined) =>
  !v || /INCOLLA_QUI|xxxxxxxxxxxx/.test(v);

const supabase =
  isPlaceholder(url) || isPlaceholder(key)
    ? null
    : createClient(url!, key!, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
const maybeTest = supabase ? test : test.skip;

maybeTest(
  "nessuna riga di activity_events ha corpo/health_flag nel payload (fix retroattivo migration_042)",
  async () => {
    // Niente operatore `?` di jsonb via PostgREST (non è tra i filtri
    // standard esposti): si scarica il payload di ogni readiness.pre e si
    // controlla lato client — il volume di questa tabella resta piccolo
    // (vedi commento in digest.ts sulla finestra di 21 giorni).
    const { data, error } = await supabase!
      .from("activity_events")
      .select("payload")
      .eq("type", "readiness.pre");
    assert.equal(error, null, error?.message);
    const leaked = (data ?? []).filter(
      (r) => "corpo" in (r.payload as Record<string, unknown>) ||
        "health_flag" in (r.payload as Record<string, unknown>),
    );
    assert.equal(
      leaked.length,
      0,
      "il fix retroattivo (migration_042) non deve avere lasciato righe",
    );
  },
);

maybeTest(
  "un nuovo check-in readiness.pre non produce un evento con corpo/health_flag (fix del path applicativo)",
  async () => {
    // Non passa da savePre() (server action, richiede una sessione utente):
    // verifica direttamente l'invariante sulla riga PIÙ RECENTE di tipo
    // readiness.pre — se il path applicativo (src/app/app/readiness-actions.ts)
    // tornasse a scrivere quelle chiavi, questo test lo scoprirebbe sul
    // prossimo check-in reale, senza aspettare un altro giro di audit.
    const { data, error } = await supabase!
      .from("activity_events")
      .select("payload")
      .eq("type", "readiness.pre")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    assert.equal(error, null, error?.message);
    if (!data) return; // nessun readiness.pre ancora a DB: niente da verificare qui
    const payload = data.payload as Record<string, unknown>;
    assert.equal("corpo" in payload, false);
    assert.equal("health_flag" in payload, false);
  },
);
