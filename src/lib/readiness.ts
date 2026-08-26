// GLIDE — dominio readiness v3 (GLIDE_QUESTIONARIO.md / ADR-006 / ADR-013).
// 5 = SEMPRE meglio. Nessuna inversione, nessun "6 - x". Due indici separati,
// calcolati dalla vista v_readiness. Il nuotatore NON vede mai il suo indice.
//
// ADR-013: il blocco dolore strutturato (corpo/pain_sites/health_flag/
// red_flag) è stato rimosso — è dato sanitario ai sensi del GDPR a
// prescindere dall'uso. Dolore e sintomi si segnalano in chat o nella nota
// libera: il matcher ADR-004 (L1/L2, testo libero) resta l'unico canale,
// invariato.

/** Riga della vista v_readiness (per il COACH). Gli indici stanno qui. */
export type VReadinessRow = {
  id: string;
  swimmer_id: string;
  created_at: string;
  sonno: number | null;
  energia: number | null;
  umore_pre: number | null;
  motivazione: number | null;
  rpe: number | null;
  umore_post: number | null;
  main_set_sig: string | null;
  nota: string | null; // nota libera del nuotatore al post-sessione ("per Alessio")
  workout_id: string | null;
  readiness_fisica: number | null; // (sonno+energia)/2 — solo coach
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
 * Domande PRE — 4 scale, 1..5, "5 = meglio" su tutte. Ancore VISIBILI.
 * `key` = colonna DB grezza (energia è l'ex fatigue già girata a "5=meglio",
 * non si applica nessun 6-x). "Corpo" è stata rimossa (ADR-013).
 */
export const PRE_QUESTIONS: {
  key: "sleep" | "energia" | "mood" | "motivation";
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

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
