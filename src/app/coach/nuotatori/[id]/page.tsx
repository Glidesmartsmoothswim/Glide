import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Card, Pill } from "@/components/ui/card";
import { WorkoutEditor } from "@/components/workout/editor";
import { WorkoutCard } from "@/components/workout/workout-card";
import { savePersonalWorkout } from "../../workout-actions";
import { archiveSwimmer } from "../actions";
import { EditSwimmerForm } from "./edit-form";
import {
  SERVICE_LABEL,
  fullName,
  initials,
  type SwimmerRow,
  type WorkoutRow,
} from "@/lib/types";

export default async function SwimmerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: s } = await supabase
    .from("profiles")
    .select(
      "id, role, first_name, last_name, email, phone, service_type, level, package, status, cert_status, cert_expiry, member_since",
    )
    .eq("id", id)
    .single();

  if (!s) notFound();
  const swimmer = s as SwimmerRow;

  const { data: wData } = await supabase
    .from("workouts")
    .select("*")
    .eq("swimmer_id", id)
    .eq("kind", "personal")
    .order("created_at", { ascending: false });
  const workouts = (wData ?? []) as WorkoutRow[];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        href="/coach/nuotatori"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} /> Nuotatori
      </Link>

      <header className="flex items-center gap-4">
        <Avatar text={initials(swimmer)} />
        <div className="flex-1">
          <h1 className="font-display text-2xl text-foreground">
            {fullName(swimmer)}
          </h1>
          <p className="text-sm text-muted">
            {SERVICE_LABEL[swimmer.service_type]}
            {swimmer.email ? ` · ${swimmer.email}` : ""}
          </p>
        </div>
        {swimmer.package && <Pill tone="brand">{swimmer.package}</Pill>}
      </header>

      <Card>
        <h2 className="mb-4 font-display text-lg text-foreground">Scheda atleta</h2>
        <EditSwimmerForm s={swimmer} />
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg text-foreground">
          Nuova scheda personale
        </h2>
        <Card>
          <WorkoutEditor
            action={savePersonalWorkout}
            context="personal"
            swimmerId={swimmer.id}
            submitLabel="Salva scheda personale"
          />
        </Card>
      </section>

      {workouts.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg text-foreground">
            Schede ({workouts.length})
          </h2>
          {workouts.map((w) => (
            <WorkoutCard key={w.id} w={w} />
          ))}
        </section>
      )}

      <form action={archiveSwimmer} className="pt-2">
        <input type="hidden" name="id" value={swimmer.id} />
        <button
          type="submit"
          className="text-sm text-muted underline hover:text-[#DC2626]"
        >
          Archivia nuotatore (imposta “scaduto”)
        </button>
      </form>
    </div>
  );
}
