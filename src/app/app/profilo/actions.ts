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
