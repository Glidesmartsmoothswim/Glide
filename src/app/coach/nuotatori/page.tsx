import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar, Card, Pill } from "@/components/ui/card";
import {
  SERVICE_LABEL,
  STATUS_LABEL,
  CERT_LABEL,
  fullName,
  initials,
  type SwimmerRow,
  type CertStatus,
  type SwimmerStatus,
} from "@/lib/types";
import { NewSwimmer } from "./new-swimmer";

export const metadata = { title: "Nuotatori" };

const statusTone: Record<SwimmerStatus, "ok" | "warn" | "neutral"> = {
  attivo: "ok",
  in_pausa: "warn",
  scaduto: "neutral",
};
const certTone: Record<CertStatus, "ok" | "warn" | "bad"> = {
  valido: "ok",
  in_scadenza: "warn",
  assente: "bad",
};

export default async function NuotatoriPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, role, first_name, last_name, email, phone, service_type, level, package, status, cert_status, cert_expiry, member_since",
    )
    .eq("role", "swimmer")
    .order("first_name", { ascending: true });

  const swimmers = (data ?? []) as SwimmerRow[];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-foreground">Nuotatori</h1>
          <p className="text-sm text-muted">
            {swimmers.length} atlet{swimmers.length === 1 ? "a" : "i"} · gestisci schede e servizi
          </p>
        </div>
        <NewSwimmer />
      </header>

      {swimmers.length === 0 ? (
        <Card className="text-muted">
          Nessun nuotatore ancora. Creane uno con “Nuovo nuotatore”, oppure
          invita gli atleti a registrarsi: nascono come swimmer.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {swimmers.map((s) => (
            <Link key={s.id} href={`/coach/nuotatori/${s.id}`}>
              <Card className="transition-colors hover:border-blu">
                <div className="flex items-center gap-3">
                  <Avatar text={initials(s)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">
                      {fullName(s)}
                    </p>
                    <p className="truncate text-sm text-muted">
                      {SERVICE_LABEL[s.service_type]}
                      {s.level ? ` · ${s.level}` : ""}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-muted" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Pill tone={statusTone[s.status]}>{STATUS_LABEL[s.status]}</Pill>
                  <Pill tone={certTone[s.cert_status]}>
                    Cert. {CERT_LABEL[s.cert_status]}
                  </Pill>
                  {s.package && <Pill tone="brand">{s.package}</Pill>}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
