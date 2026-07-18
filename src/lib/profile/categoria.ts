/**
 * Categoria Master FIN a partire dall'anno di nascita.
 *
 * Regola: si guarda l'ETÀ COMPIUTA AL 31/12 della stagione corrente
 * (= anno stagione − anno di nascita). Fasce di 5 anni:
 *   < 25  → "U25"
 *   25-29 → "M25", 30-34 → "M30", ... 90-94 → "M90"
 *   ≥ 95  → "M95+"
 */
export function categoriaMaster(
  annoNascita: number,
  seasonYear: number = new Date().getFullYear(),
): string {
  const eta = seasonYear - annoNascita;
  if (!Number.isFinite(eta) || eta < 25) return "U25";
  const bucket = Math.floor(eta / 5) * 5;
  return bucket >= 95 ? "M95+" : `M${bucket}`;
}
