import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { WorkoutCard } from "@/components/workout/workout-card";
import type { WorkoutRow } from "@/lib/types";

export const metadata = { title: "Allenamento" };

/**
 * Dettaglio di un allenamento. L'accesso è governato dalla RLS di `workouts`
 * (Onda 12.1): settimana corrente per gli open, sempre per ciò che ho svolto,
 * le proprie schede personali. Se non accessibile → 404.
 */
export default async function WorkoutDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const w = data as WorkoutRow;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/app/nuoto"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} /> Nuoto
      </Link>
      <WorkoutCard w={w} />
      <p className="text-sm text-muted">
        Per registrare la sessione, apri il check-in dalla home (Oggi) e scegli
        questo allenamento.
      </p>
    </div>
  );
}
