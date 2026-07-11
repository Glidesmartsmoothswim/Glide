/**
 * cn — unisce classi condizionali in una sola stringa.
 * Versione minimale senza dipendenze: accetta stringhe, falsy, array.
 */
export function cn(
  ...inputs: Array<string | false | null | undefined>
): string {
  return inputs.filter(Boolean).join(" ");
}
