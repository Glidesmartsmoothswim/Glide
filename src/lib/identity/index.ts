/**
 * Identità — GLIDE_GAMIFICATION §6 (Bible: Esploratore, Costante, Tecnico,
 * Competitore, Mentore).
 *
 * "Non è una classe che scegli. È uno specchio che il sistema ti mette
 * davanti." Dopo 8 settimane di dati GLIDE non ti dà punti: ti RICONOSCE.
 *
 * Regole: nessuna classifica, nessun livello, nessun upgrade. Può cambiare
 * nel tempo. Nessuna identità è migliore delle altre. Sotto la soglia dati
 * NON si mostra niente (uno specchio con pochi dati è una maschera).
 */

export const IDENTITY_MIN_WEEKS = 8;

export type IdentityCode =
  | "esploratore"
  | "costante"
  | "tecnico"
  | "competitore"
  | "mentore";

export type Identity = {
  code: IdentityCode;
  name: string;
  /** Lo specchio: riconoscimento, mai una richiesta. */
  mirror: string;
};

export const IDENTITIES: Record<IdentityCode, Identity> = {
  esploratore: {
    code: "esploratore",
    name: "Esploratore",
    mirror:
      "Sei un Esploratore. Provi, cambi, cerchi. Non tutte le settimane si somigliano — ed è questo che ti tiene in acqua.",
  },
  costante: {
    code: "costante",
    name: "Costante",
    mirror:
      "Sei un Costante. Non salti. Non è la cosa più appariscente. È la più rara.",
  },
  tecnico: {
    code: "tecnico",
    name: "Tecnico",
    mirror:
      "Sei un Tecnico. Per te contano i dettagli: la bracciata giusta vale più della vasca veloce. E si vede.",
  },
  competitore: {
    code: "competitore",
    name: "Competitore",
    mirror:
      "Sei un Competitore. La gara ti accende — i video, i tempi, il giorno X. L'acqua per te è un campo di gioco.",
  },
  mentore: {
    code: "mentore",
    name: "Mentore",
    mirror:
      "Sei un Mentore. Tieni su gli altri, e il gruppo lo sente. Certe cose non le misura nessun cronometro.",
  },
};

/** Segnali aggregati (contatori 8+ settimane, MAI confronti con altri). */
export type IdentitySignals = {
  /** settimane trascorse dal PRIMO evento a ledger (anzianità dei dati) */
  dataAgeWeeks: number;
  /** settimane con almeno una seduta, nelle ultime 8 */
  weeksWithData: number;
  /** aderenza media 0–1 sulle ultime 8 settimane */
  adherence: number;
  /** settimane consecutive con almeno una seduta */
  steadyWeeks: number;
  /** video caricati nel periodo */
  videos: number;
  /** iscrizioni a eventi/gare nel periodo */
  raceSignups: number;
  /** test di videoanalisi scelti nel periodo */
  testsChosen: number;
  /** badge "capitano" conferito dal coach */
  capitano: boolean;
};

/**
 * Lo specchio. Ritorna null sotto la soglia dati (non si mostra niente).
 * Soglia: dati vecchi almeno 8 settimane E almeno 4 settimane con sedute
 * nelle ultime 8 — un buco non azzera lo specchio, ma pochi dati non fanno
 * un ritratto. Ordine di riconoscimento: il segnale più DISTINTIVO vince;
 * l'Esploratore è il ritratto di chi non ha un tratto dominante — mai un
 * ripiego negativo.
 */
export function reflect(s: IdentitySignals): Identity | null {
  if (s.dataAgeWeeks < IDENTITY_MIN_WEEKS || s.weeksWithData < 4) return null;

  // Mentore: il coach l'ha visto (badge conferito). Il giudizio umano vince.
  if (s.capitano) return IDENTITIES.mentore;

  // Competitore: gare/video sono il suo linguaggio.
  if (s.raceSignups >= 2 || s.videos >= 3) return IDENTITIES.competitore;

  // Tecnico: sceglie i test, carica video per l'analisi (non per la gara).
  if (s.testsChosen >= 3 || (s.videos >= 1 && s.testsChosen >= 1))
    return IDENTITIES.tecnico;

  // Costante: c'è sempre. Aderenza alta e nessun buco.
  if (s.adherence >= 0.75 && s.steadyWeeks >= 6) return IDENTITIES.costante;

  return IDENTITIES.esploratore;
}
