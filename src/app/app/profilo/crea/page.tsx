import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { ProfileWizard, type WizardInitial, type PB } from "../profile-wizard";

export const metadata: Metadata = { title: "Il tuo profilo" };

export default async function CreaProfiloPage() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  const { data: p } = await supabase
    .from("profiles")
    .select(
      "athlete_type, anno_nascita, categoria, stili_abituali, distanze_abituali",
    )
    .eq("id", profile?.id ?? "")
    .single();

  const { data: pbs } = await supabase
    .from("personal_bests")
    .select("id, distanza_m, stile, vasca, tempo_cc, data_conseguimento")
    .eq("swimmer_id", profile?.id ?? "");

  const { data: intake } = await supabase
    .from("intake")
    .select("*")
    .eq("user_id", profile?.id ?? "")
    .maybeSingle();

  const initial: WizardInitial = {
    athlete_type: p?.athlete_type ?? null,
    anno_nascita: p?.anno_nascita ?? null,
    categoria: p?.categoria ?? null,
    stili_abituali: p?.stili_abituali ?? [],
    distanze_abituali: p?.distanze_abituali ?? [],
    personalBests: (pbs ?? []) as PB[],
    intake: intake ?? null,
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl text-foreground">
          Crea il tuo profilo
        </h1>
        <p className="text-sm text-muted">
          Bastano pochi dati. Puoi saltare e completarli quando vuoi.
        </p>
      </header>
      <ProfileWizard initial={initial} />
    </div>
  );
}
