"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { categoriaMaster } from "@/lib/profile/categoria";
import { isStile, isVasca, DISTANZE_PB } from "@/lib/profile/costanti";
import {
  createSubscriptionCheckout,
  type SubTier,
} from "@/lib/stripe-checkout";

/** Avvia il checkout abbonamento; se Stripe non è configurato → nota simulata. */
export async function subscribe(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const tier = String(formData.get("tier") ?? "open") as SubTier;
  const url = await createSubscriptionCheckout({ tier, swimmerId: profile.id });
  redirect(url ?? "/app/profilo?sim=1");
}

export type ProfileState = { error?: string; info?: string };

/** Passo 1-2 del profilo: anno/categoria + specialità dichiarate. */
export async function saveProfileBasics(input: {
  anno_nascita?: number | null;
  categoria?: string | null;
  stili_abituali?: string[];
  distanze_abituali?: string[];
}): Promise<ProfileState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };
  const supabase = await createClient();

  const patch: Record<string, unknown> = {};
  if (input.anno_nascita != null && Number.isFinite(input.anno_nascita)) {
    const anno = Math.trunc(input.anno_nascita);
    const year = new Date().getFullYear();
    if (anno < 1900 || anno > year) return { error: "Anno di nascita non valido." };
    patch.anno_nascita = anno;
    patch.categoria = input.categoria?.trim() || categoriaMaster(anno);
  }
  if (Array.isArray(input.stili_abituali))
    patch.stili_abituali = input.stili_abituali.filter(isStile);
  if (Array.isArray(input.distanze_abituali))
    patch.distanze_abituali = input.distanze_abituali.map(String);

  if (Object.keys(patch).length === 0) return { info: "Niente da salvare." };

  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", profile.id);
  if (error) return { error: error.message };

  revalidatePath("/app/profilo");
  return { info: "Profilo aggiornato." };
}

/** Passo 3: upsert di un personal best (unico per distanza+stile+vasca). */
export async function upsertPersonalBest(input: {
  distanza_m: number;
  stile: string;
  vasca: string;
  tempo_cc: number;
  data_conseguimento?: string | null;
}): Promise<{ error?: string; updated?: boolean }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };

  if (!(DISTANZE_PB as readonly number[]).includes(input.distanza_m))
    return { error: "Distanza non valida." };
  if (!isStile(input.stile)) return { error: "Stile non valido." };
  if (!isVasca(input.vasca)) return { error: "Vasca non valida." };
  if (!Number.isInteger(input.tempo_cc) || input.tempo_cc <= 0)
    return { error: "Tempo non valido." };
  if (input.data_conseguimento) {
    const d = new Date(input.data_conseguimento);
    if (Number.isNaN(d.getTime()) || d.getTime() > Date.now())
      return { error: "La data non può essere nel futuro." };
  }

  const supabase = await createClient();
  // Esisteva già la combinazione? Serve a dire "aggiornato" vs "aggiunto".
  const { data: existing } = await supabase
    .from("personal_bests")
    .select("id")
    .eq("swimmer_id", profile.id)
    .eq("distanza_m", input.distanza_m)
    .eq("stile", input.stile)
    .eq("vasca", input.vasca)
    .maybeSingle();

  const { error } = await supabase.from("personal_bests").upsert(
    {
      swimmer_id: profile.id,
      distanza_m: input.distanza_m,
      stile: input.stile,
      vasca: input.vasca,
      tempo_cc: input.tempo_cc,
      data_conseguimento: input.data_conseguimento || null,
    },
    { onConflict: "swimmer_id,distanza_m,stile,vasca" },
  );
  if (error) return { error: error.message };

  revalidatePath("/app/profilo");
  return { updated: Boolean(existing) };
}

/** Rimuove un personal best (RLS: solo i propri). */
export async function deletePersonalBest(id: string): Promise<{ error?: string }> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("personal_bests")
    .delete()
    .eq("id", id)
    .eq("swimmer_id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/app/profilo");
  return {};
}

/* ---- Intake v2 (Sprint V.1) ---- */

/** Step 0: agonista / libero. */
export async function setAthleteType(
  type: "agonista" | "libero",
): Promise<ProfileState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };
  if (type !== "agonista" && type !== "libero")
    return { error: "Tipo non valido." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ athlete_type: type })
    .eq("id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/app/profilo");
  return { info: "Salvato." };
}

/** Upsert dell'intake (una riga per utente). goal/freq/vasca sono obbligatori. */
export async function saveIntake(input: {
  goal_primary: string;
  goal_note?: string | null;
  freq_settimanale: string;
  vasca: number;
  anni_nuoto?: string | null;
  continuita?: string | null;
  gare_12m?: boolean | null;
  esperienza_intensita?: boolean | null;
  device_fc?: boolean | null;
  corsi?: string | null;
  stili?: string[] | null;
  autovalutazione?: number | null;
  aree_miglioramento?: string[] | null;
}): Promise<ProfileState> {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Sessione scaduta." };
  if (!input.goal_primary || !input.freq_settimanale || !input.vasca)
    return { error: "Completa obiettivo, frequenza e vasca." };

  const supabase = await createClient();
  const { error } = await supabase.from("intake").upsert(
    {
      user_id: profile.id,
      goal_primary: input.goal_primary,
      goal_note: input.goal_note ?? null,
      freq_settimanale: input.freq_settimanale,
      vasca: input.vasca,
      anni_nuoto: input.anni_nuoto ?? null,
      continuita: input.continuita ?? null,
      gare_12m: input.gare_12m ?? null,
      esperienza_intensita: input.esperienza_intensita ?? null,
      device_fc: input.device_fc ?? null,
      corsi: input.corsi ?? null,
      stili: input.stili ?? null,
      autovalutazione: input.autovalutazione ?? null,
      aree_miglioramento: input.aree_miglioramento ?? null,
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };
  revalidatePath("/app/profilo");
  return { info: "Intake salvato." };
}

/** Segna come visto l'onboarding (flag su profiles, non più localStorage). */
export async function setOnboardingDone(): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile) return;
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ onboarding_done: true })
    .eq("id", profile.id);
}
