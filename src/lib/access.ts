/**
 * Onda 12.1 — Modello di accesso a tier.
 *
 * UNICO punto di verità del gating. La matrice è ESPLICITA (nessuna gerarchia
 * implicita): ogni risorsa elenca i tier che la possono vedere. Va applicata
 * SIA in UI (nasconde / mette il lucchetto) SIA lato server/RLS (rifiuta).
 *
 * Nota di prodotto: `one_to_one` = percorso dedicato (Programmazione 1:1) +
 * libreria completa. NON accede al Canale Open (settimana/archivio): quello è
 * la programmazione di SUPPORTO per open/open_plus. L'archivio personale degli
 * svolti è sempre del proprietario (ownership, non tier) e resta leggibile
 * anche se il tier scende: non passa da qui.
 */

export const TIERS = ["free", "open", "open_plus", "one_to_one"] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_LABEL: Record<Tier, string> = {
  free: "Free",
  open: "Open",
  open_plus: "Open+",
  one_to_one: "1:1",
};

/** Visibilità di un contenuto libreria = uno dei tier. */
export type Visibility = Tier;

/** Risorse gated. Le chiavi libreria.* mappano 1:1 sulla visibilità. */
export type Resource =
  | "library:free"
  | "library:open"
  | "library:open_plus"
  | "library:one_to_one"
  | "open:week" // settimana corrente Canale Open
  | "open:archive" // archivio storico completo (12.4)
  | "events:book" // prenotazione eventi singoli
  | "profile"; // area profilo

/** Matrice esplicita risorsa → tier ammessi. */
export const ACCESS_MATRIX: Record<Resource, readonly Tier[]> = {
  "library:free": ["free", "open", "open_plus", "one_to_one"],
  "library:open": ["open", "open_plus", "one_to_one"],
  "library:open_plus": ["open_plus", "one_to_one"],
  "library:one_to_one": ["one_to_one"],
  "open:week": ["open", "open_plus"],
  "open:archive": ["open_plus"],
  "events:book": ["free", "open", "open_plus", "one_to_one"],
  profile: ["free", "open", "open_plus", "one_to_one"],
};

/** Vero se il tier può accedere alla risorsa. */
export function canAccess(tier: Tier, resource: Resource): boolean {
  return ACCESS_MATRIX[resource].includes(tier);
}

/** Risorsa libreria corrispondente a una visibilità. */
export function libraryResource(visibility: Visibility): Resource {
  return `library:${visibility}` as Resource;
}

/** Vero se il tier può SBLOCCARE (aprire il file di) un contenuto libreria. */
export function canOpenLibraryItem(tier: Tier, visibility: Visibility): boolean {
  return canAccess(tier, libraryResource(visibility));
}

/**
 * Piano da proporre a chi non ha accesso a una certa visibilità libreria.
 * Ritorna il tier minimo che sblocca (per l'invito non aggressivo). Null se
 * già accessibile a tutti.
 */
export function upgradeTargetFor(visibility: Visibility): Tier | null {
  const allowed = ACCESS_MATRIX[libraryResource(visibility)];
  if (allowed.includes("free")) return null;
  // il tier minimo pagante che sblocca
  return (["open", "open_plus", "one_to_one"] as Tier[]).find((t) =>
    allowed.includes(t),
  ) ?? null;
}
