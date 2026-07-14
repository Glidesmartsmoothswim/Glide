import { ReadinessChart, type Point } from "./chart";
import {
  shortDate,
  type VReadinessRow,
  type EffettoAcquaRow,
} from "@/lib/readiness";
import { Card } from "@/components/ui/card";

/**
 * COACH — i due indici (fisica e mentale) nel tempo. Mai mediati (ADR-006 §3).
 * Fisica bassa = alleggerisci; mentale bassa = NON alleggerire.
 * Questa vista è SOLO per il coach: il nuotatore non vede il proprio indice.
 */
export function ReadinessProgress({ rows }: { rows: VReadinessRow[] }) {
  const asc = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const fisica: Point[] = asc
    .filter((r) => r.readiness_fisica != null)
    .map((r) => ({ label: shortDate(r.created_at), value: Number(r.readiness_fisica) }))
    .slice(-12);
  const mentale: Point[] = asc
    .filter((r) => r.readiness_mentale != null)
    .map((r) => ({ label: shortDate(r.created_at), value: Number(r.readiness_mentale) }))
    .slice(-12);

  const withPain = [...rows]
    .filter((r) => r.pain_sites && r.pain_sites.length)
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h3 className="t-label mb-2 text-muted">Readiness fisica (1–5)</h3>
        <ReadinessChart points={fisica} color="#0E5EAB" max={5} />
      </Card>
      <Card>
        <h3 className="t-label mb-2 text-muted">Readiness mentale (1–5)</h3>
        <ReadinessChart points={mentale} color="#203979" max={5} />
      </Card>
      {withPain.length > 0 && (
        <Card>
          <h3 className="t-label mb-2 text-muted">Dolori segnalati</h3>
          <ul className="flex flex-col gap-1">
            {withPain.map((r) => (
              <li key={r.id} className="t-small text-foreground">
                {shortDate(r.created_at)} · {r.pain_sites!.join(", ")}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/**
 * NUOTATORE — niente indice di readiness (ADR-006 §4). Vede solo l'Effetto Acqua,
 * e solo con >= 20 sessioni (sotto è rumore).
 */
export function SwimmerProgress({ effetto }: { effetto: EffettoAcquaRow | null }) {
  if (!effetto || effetto.sessioni < 20) {
    const n = effetto?.sessioni ?? 0;
    return (
      <Card className="t-body text-muted">
        I tuoi progressi si costruiscono coi check-in. Ancora {20 - n} sessioni e
        ti mostro l&apos;Effetto Acqua — onda dopo onda.
      </Card>
    );
  }
  return (
    <Card>
      <p className="t-body-lg text-foreground">
        Sei entrato in acqua <b>{effetto.sessioni}</b> volte.{" "}
        <b>{effetto.uscito_meglio}</b> volte ne sei uscito meglio di come sei
        entrato.
      </p>
    </Card>
  );
}
