/**
 * Safety router sanitario — ADR-004. DETERMINISTICO, puro, testabile.
 *
 * Il testo del nuotatore passa da QUI PRIMA di arrivare a qualsiasi modello.
 * Se scatta un livello, il modello NON viene mai chiamato: risponde un
 * template fisso. Un LLM non può freelanceare su una risposta che non genera.
 *
 * Regole assolute:
 *  - mai rassicurare ("sarà nulla" è vietato), mai chiedere dettagli clinici;
 *  - il CONTENUTO del sintomo non lascia mai questo modulo verso il ledger:
 *    solo health_flag booleano.
 */

export type SafetyLevel = "l1" | "l2" | null;

/** L1 — Muscoloscheletrico (ADR-004). */
const L1_KEYWORDS = [
  "dolore",
  "male",
  "fitta",
  "infiammazione",
  "tendine",
  "spalla",
  "schiena",
  "ginocchio",
  "gonfiore",
];

/** L2 — Red flag (ADR-004 + runbook 7.1). */
const L2_KEYWORDS = [
  "petto",
  "torace",
  "fiato",
  "respiro",
  "battito",
  "palpitazioni",
  "vertigini",
  "svenimento",
  "nausea",
  "vista",
];

/** L2 — frasi multi-parola (runbook 7.1: "testa che gira"). */
const L2_PHRASES = ["testa che gira", "gira la testa", "girava la testa"];

/** Template fissi — copy ESATTO dall'ADR-004. Non parafrasare. */
export const SAFETY_TEMPLATES: Record<"l1" | "l2", string> = {
  l1: "Segnalo la cosa ad Alessio. Se il dolore è forte, o non passa in qualche giorno, senti un medico prima di tornare in acqua.",
  l2: "Fermati. Questi sintomi vanno visti da un medico, non da un'app. Se stai male ora, chiama il 112.",
};

/** Normalizza per il match: minuscole, senza accenti (combining U+0300-036F). */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Match su parola intera (con plurali semplici -i/-e/-a/-o come suffisso). */
function hasKeyword(text: string, words: string[]): boolean {
  const t = norm(text);
  return words.some((w) =>
    new RegExp(`(^|[^a-z])${w}[a-z]{0,2}([^a-z]|$)`).test(t),
  );
}

/**
 * Classifica il messaggio. L2 vince su L1 (il red flag è prioritario).
 * Ritorna il livello, MAI il contenuto: chi chiama non deve propagare il testo.
 */
export function classify(text: string): SafetyLevel {
  const t = norm(text);
  if (L2_PHRASES.some((p) => t.includes(p))) return "l2";
  if (hasKeyword(text, L2_KEYWORDS)) return "l2";
  if (hasKeyword(text, L1_KEYWORDS)) return "l1";
  return null;
}
