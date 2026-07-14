// GLIDE — dominio readiness v2 (GLIDE_QUESTIONARIO.md / ADR-006).
// 5 = SEMPRE meglio. Nessuna inversione, nessun "6 - x". Due indici separati,
// calcolati dalla vista v_readiness. Il nuotatore NON vede mai il suo indice.

/** Riga della vista v_readiness (per il COACH). Gli indici stanno qui. */
export type VReadinessRow = {
  id: string;
  swimmer_id: string;
  created_at: string;
  sonno: number | null;
  energia: number | null;
  corpo: number | null;
  umore_pre: number | null;
  motivazione: number | null;
  rpe: number | null;
  umore_post: number | null;
  main_set_sig: string | null;
  pain_sites: string[] | null;
  health_flag: boolean;
  readiness_fisica: number | null; // (sonno+energia+corpo)/3 — solo coach
  readiness_mentale: number | null; // (umore+motivazione)/2 — solo coach
  effetto_acqua: number | null; // umore_post - umore_pre
};

/** Riga aggregata da v_effetto_acqua (visibile al nuotatore con >= 20 sessioni). */
export type EffettoAcquaRow = {
  swimmer_id: string;
  sessioni: number;
  uscito_meglio: number;
  uguale: number;
  uscito_peggio: number;
  delta_medio: number | null;
};

/**
 * Domande PRE — 5 scale, 1..5, "5 = meglio" su tutte. Ancore VISIBILI.
 * `key` = colonna DB grezza (energia/corpo sono le ex fatigue/soreness già
 * girate a "5=meglio", non si applica nessun 6-x).
 */
export const PRE_QUESTIONS: {
  key: "sleep" | "energia" | "corpo" | "mood" | "motivation";
  label: string;
  anchors: [string, string, string, string, string]; // ancore per 1..5
}[] = [
  {
    key: "sleep",
    label: "Come hai dormito?",
    anchors: ["Non ho chiuso occhio", "Male, poche ore", "Così così", "Bene", "Come un sasso"],
  },
  {
    key: "energia",
    label: "Quanta energia hai?",
    anchors: ["Sono a terra", "Poca", "Normale", "Bella carica", "Pieno serbatoio"],
  },
  {
    key: "corpo",
    label: "Come sta il corpo?",
    anchors: ["Dolore forte", "Fa male", "Qualche fastidio", "Un po' rigido", "Zero dolori"],
  },
  {
    key: "mood",
    label: "Come stai, fuori dall'acqua?",
    anchors: ["Giornataccia", "Non benissimo", "Normale", "Bene", "Alla grande"],
  },
  {
    key: "motivation",
    label: "Quanta voglia hai di entrare in acqua oggi?",
    anchors: ["Zero, non vorrei essere qui", "Poca", "Normale", "Tanta", "Non vedo l'ora"],
  },
];

/** Ancore RPE post (Borg CR10 adattata). Gli intermedi restano tappabili. */
export const RPE_ANCHORS: Record<number, string> = {
  1: "Passeggiata",
  3: "Facile, potevo andare avanti a lungo",
  5: "Impegnativa ma sotto controllo",
  7: "Dura, parlare era difficile",
  9: "Al limite",
  10: "Massimo, non avevo altro da dare",
};

/** Stessa scala dell'umore pre — riusata per "E adesso come stai?". */
export const MOOD_ANCHORS: [string, string, string, string, string] = [
  "Giornataccia",
  "Non benissimo",
  "Normale",
  "Bene",
  "Alla grande",
];

/** Sedi del dolore (obbligatorio se corpo <= 3). MAI copiate in activity_events. */
export const PAIN_SITES = [
  "Spalla dx",
  "Spalla sx",
  "Schiena",
  "Collo",
  "Ginocchio",
  "Anca",
  "Gomito",
  "Altro",
] as const;

/** Chip red flag (ADR-004 L2): bypassa l'LLM, notifica il coach. */
export const RED_FLAG_LABEL = "⚠︎  Petto / respiro / testa";
export const L2_TEMPLATE =
  "Fermati. Questi sintomi vanno visti da un medico, non da un'app. Se stai male ora, chiama il 112.";

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
