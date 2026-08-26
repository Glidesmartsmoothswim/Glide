import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

/**
 * ADR-013 / migration_041_readiness_remove_pain_fields.sql (v3.1: aggiunge
 * `fatigue`/`soreness`, legacy pre-v2 con lo stesso problema di `corpo`).
 *
 * `pain_sites`, `corpo`, `health_flag`, `red_flag`, `fatigue`, `soreness` non
 * devono più esistere a schema; `v_readiness`/`v_effetto_acqua`/
 * `v_efficiency_points` devono restare leggibili; `readiness_fisica` deve
 * valere (sonno+energia)/2, non più /3 con `corpo`.
 *
 * Richiede un progetto Supabase reale raggiungibile (NEXT_PUBLIC_SUPABASE_URL
 * + SUPABASE_SERVICE_ROLE_KEY) con la migration già applicata: se non
 * configurato, i test saltano invece di fallire (es. CI senza secrets). Non
 * è un test contro la migration NON ancora applicata al progetto live (vedi
 * STATO.md / PROMPT_CODE_READINESS_V3.md): eseguirlo è la verifica da fare
 * subito dopo l'apply, prima di considerare il task concluso.
 *
 * NB: non si importa `@/lib/supabase/admin` (o `@/lib/env`) perché quel
 * modulo valida le env pubbliche a caricamento e va in crash se mancano —
 * qui invece l'assenza di configurazione deve solo far saltare i test.
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

const REMOVED_COLUMNS = [
  "pain_sites",
  "corpo",
  "health_flag",
  "red_flag",
  "fatigue",
  "soreness",
] as const;

for (const col of REMOVED_COLUMNS) {
  maybeTest(`ADR-013: \`${col}\` non esiste più a schema`, async () => {
    // La colonna rimossa fa fallire l'insert PRIMA di qualunque check su
    // swimmer_id (l'errore di colonna inesistente scatta in fase di parsing,
    // non serve un swimmer_id reale).
    const { error } = await supabase!.from("readiness").insert({
      swimmer_id: "00000000-0000-0000-0000-000000000000",
      phase: "pre",
      sleep: 3,
      energia: 3,
      mood: 3,
      motivation: 3,
      [col]: col === "pain_sites" ? ["Spalla dx"] : 3,
    });
    assert.ok(error, `insert con \`${col}\` avrebbe dovuto fallire (colonna rimossa)`);
    assert.match(error!.message, new RegExp(`column .*${col}.* does not exist`, "i"));
  });
}

maybeTest(
  "ADR-013: v_readiness / v_effetto_acqua / v_efficiency_points restano leggibili",
  async () => {
    for (const view of ["v_readiness", "v_effetto_acqua", "v_efficiency_points"]) {
      const { error } = await supabase!.from(view).select("*").limit(1);
      assert.equal(error, null, `${view}: ${error?.message}`);
    }
  },
);

maybeTest(
  "ADR-013: readiness_fisica = (sonno+energia)/2 su una riga reale",
  async () => {
    const { data, error } = await supabase!
      .from("v_readiness")
      .select("sonno, energia, readiness_fisica")
      .not("sonno", "is", null)
      .not("energia", "is", null)
      .limit(1)
      .maybeSingle();
    assert.equal(error, null, error?.message);
    if (!data) return; // nessun check-in ancora a DB: niente da confrontare
    const atteso = Math.round(((data.sonno + data.energia) / 2) * 100) / 100;
    assert.equal(Number(data.readiness_fisica), atteso);
  },
);
