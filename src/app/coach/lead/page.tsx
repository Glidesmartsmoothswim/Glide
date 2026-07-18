import { createClient } from "@/lib/supabase/server";
import { Card, Pill } from "@/components/ui/card";
import { NewLead } from "./new-lead";
import { setLeadStage, deleteLead } from "./actions";
import {
  STAGE_ORDER,
  STAGE_LABEL,
  SOURCE_LABEL,
  type LeadRow,
  type LeadStage,
} from "@/lib/leads";

export const metadata = { title: "Lead" };

export default async function LeadPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  const leads = (data ?? []) as LeadRow[];
  const count = (s: LeadStage) => leads.filter((l) => l.stage === s).length;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-foreground">Lead</h1>
          <p className="text-sm text-muted">
            Richieste in ingresso da convertire in nuotatori.
          </p>
        </div>
        <NewLead />
      </header>

      {/* Imbuto: conteggi per stage */}
      <div className="grid grid-cols-4 gap-2">
        {STAGE_ORDER.map((s) => (
          <div
            key={s}
            className="rounded-xl border border-border bg-surface p-3 text-center"
          >
            <div className="font-display text-2xl text-foreground">
              {count(s)}
            </div>
            <div className="text-xs text-muted">{STAGE_LABEL[s]}</div>
          </div>
        ))}
      </div>

      {leads.length === 0 ? (
        <Card className="text-muted">
          Nessun lead. Aggiungi il primo con “Nuovo lead”.
        </Card>
      ) : (
        STAGE_ORDER.map((s) => {
          const items = leads.filter((l) => l.stage === s);
          if (!items.length) return null;
          return (
            <section key={s} className="flex flex-col gap-3">
              <h2 className="font-display text-lg text-foreground">
                {STAGE_LABEL[s]} ({items.length})
              </h2>
              {items.map((l) => (
                <LeadCard key={l.id} l={l} />
              ))}
            </section>
          );
        })
      )}
    </div>
  );
}

function LeadCard({ l }: { l: LeadRow }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-foreground">{l.name}</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
            {l.phone && (
              <a href={`tel:${l.phone}`} className="hover:text-foreground">
                {l.phone}
              </a>
            )}
            {l.email && (
              <a href={`mailto:${l.email}`} className="hover:text-foreground">
                {l.email}
              </a>
            )}
          </div>
        </div>
        {l.source && <Pill tone="brand">{SOURCE_LABEL[l.source]}</Pill>}
      </div>

      {l.note && <p className="text-sm text-foreground/80">{l.note}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {l.stage === "nuovo" && (
          <StageButton id={l.id} to="contattato" label="Contattato" primary />
        )}
        {l.stage === "contattato" && (
          <>
            <StageButton id={l.id} to="convertito" label="Convertito" primary />
            <StageButton id={l.id} to="perso" label="Perso" />
          </>
        )}
        {(l.stage === "convertito" || l.stage === "perso") && (
          <StageButton id={l.id} to="contattato" label="Riapri" />
        )}

        <form action={deleteLead} className="ml-auto">
          <input type="hidden" name="id" value={l.id} />
          <button
            type="submit"
            className="text-sm text-muted hover:text-[#DC2626]"
          >
            Elimina
          </button>
        </form>
      </div>
    </Card>
  );
}

function StageButton({
  id,
  to,
  label,
  primary,
}: {
  id: string;
  to: LeadStage;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={setLeadStage}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="stage" value={to} />
      <button
        type="submit"
        className={
          primary
            ? "rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-white"
            : "rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:border-blu"
        }
      >
        {label}
      </button>
    </form>
  );
}
