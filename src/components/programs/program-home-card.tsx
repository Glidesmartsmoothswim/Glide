import { Card } from "@/components/ui/card";
import {
  currentPhase,
  daysToRace,
  PHASE_LABEL,
  type ProgramRow,
  type PhaseRow,
} from "@/lib/programs";

/**
 * Card programma sulla home del nuotatore — sola lettura, sobria (§3.4).
 * Niente conto alla rovescia ansiogeno (niente rosso), niente obiettivo
 * cronometrico se il coach non l'ha compilato.
 */
export function ProgramHomeCard({
  program,
  phases,
}: {
  program: ProgramRow;
  phases: PhaseRow[];
}) {
  const ph = currentPhase(phases);
  const days = daysToRace(program.goal_race_date);

  return (
    <Card className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-blu">
        Il tuo programma
      </span>
      <h2 className="font-display text-lg text-foreground">
        {program.goal_race_name
          ? `Verso ${program.goal_race_name}`
          : program.title}
      </h2>
      <p className="text-sm text-muted">
        {ph ? `Fase: ${PHASE_LABEL[ph.phase_type]}` : program.title}
        {days != null && days >= 0 ? ` · gara tra ${days} giorni` : ""}
        {program.goal_race_date
          ? ` — ${program.goal_race_date}${
              program.goal_race_pool ? `, vasca ${program.goal_race_pool}` : ""
            }`
          : ""}
      </p>
      {program.goal_time_target && (
        <p className="text-sm text-foreground">
          Obiettivo: {program.goal_time_target}
        </p>
      )}
    </Card>
  );
}
