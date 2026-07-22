"use client";

import { useEffect, useState } from "react";

/* ---------- HOME GREETING ----------
 * Saluto in cima alla home nuotatore. Registro: l'oste che accoglie (caldo,
 * proverbiale). Un solo "!", proverbio italiano piegato al nuoto, mai adulazione.
 * ADR-005: in Pausa nessun proverbio, nessuno sprone — silenzio.
 */
const GREETINGS: Record<string, string[]> = {
  mattina: [
    "Il mattino ha l'oro in bocca — e la corsia è ancora libera. Andiamo!",
    "Chi dorme non piglia pesci. E nemmeno buoni tempi. Sveglia.",
    "Il buongiorno si vede dal mattino. E dalla prima vasca.",
    "Prima dell'ufficio c'è la vasca. Rispetto.",
  ],
  giorno: [
    "Goccia dopo goccia si scava la roccia. Vasca dopo vasca, uguale.",
    "Chi va piano va sano e va lontano. In acqua funziona così.",
    "L'acqua è dove l'hai lasciata: non si è mossa senza di te.",
    "Il rumore degli schizzi si fa sempre più forte: tocca a te.",
  ],
  sera: [
    "Rosso di sera, bella nuotata si spera. Occhialini e via.",
    "La vasca di sera perdona anche i lunedì storti.",
    "Ultima corsia buona della giornata. Prendila.",
    "Chi la dura la vince — e stasera duri tu.",
  ],
};

export function HomeGreeting({
  firstName,
  isPaused,
  sessionLabel,
}: {
  firstName: string;
  isPaused: boolean;
  /** Sessione di oggi già formattata, es "18:30 · Vasca". Null se nessuna. */
  sessionLabel: string | null;
}) {
  // Fascia e proverbio dipendono dall'ORA LOCALE del nuotatore: li calcoliamo
  // dopo il mount (niente disallineamento con il render sul server, in UTC).
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    const fascia = h < 8 ? "mattina" : h < 18 ? "giorno" : "sera";
    const banco = GREETINGS[fascia];
    // Stabile per tutta la giornata (nessun salto al refresh).
    setLine(banco[now.getDate() % banco.length]);
  }, []);

  const sub = isPaused
    ? "Sei in pausa. Riposare è parte del lavoro. Ci si vede quando torni."
    : sessionLabel
      ? `Oggi tocca a te. ${sessionLabel}.`
      : "Niente in programma. L'acqua aspetta senza fretta.";

  return (
    <div>
      <p className="text-sm text-muted">Ciao {firstName}.</p>

      {/* In pausa il proverbio sparisce: solo il messaggio, sommesso (ADR-005). */}
      {!isPaused && line && (
        <h2 className="mt-2 font-display text-2xl leading-tight text-foreground">
          {line}
        </h2>
      )}

      <p
        className={`mt-3 text-base font-semibold ${isPaused ? "text-muted" : "text-blu"}`}
      >
        {sub}
      </p>

      <span className="mt-1 block text-xs tracking-wide text-muted/60">
        vasca dopo vasca
      </span>
    </div>
  );
}
