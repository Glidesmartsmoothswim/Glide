/**
 * Onda 28.1 — leggibilità dell'agenda: quando la stessa finestra ricorrente
 * è duplicata su più giorni (`duplicateRuleAllWeek`/manualmente), l'elenco
 * "Finestre attive" mostrava una riga IDENTICA per giorno — dispersivo con
 * poche occhiate. Qui si raggruppano le regole con lo stesso orario/passo/
 * modalità/etichetta in UNA riga con i giorni della settimana come chip,
 * invece di ripetere la riga N volte.
 */

export type AvailabilityRule = {
  id: string;
  weekday: number; // 0=Dom … 6=Sab (convenzione JS Date#getDay, come WD in UI)
  start_time: string;
  end_time: string;
  slot_step: number;
  modes: string[];
  label: string | null;
};

export type RuleGroup = {
  key: string;
  start_time: string;
  end_time: string;
  slot_step: number;
  modes: string[];
  label: string | null;
  /** id della regola per ciascun giorno (indice 0=Dom…6=Sab), null se assente. */
  byDay: (string | null)[];
};

/** Ordine di visualizzazione lun→dom (indici nella convenzione 0=Dom…6=Sab). */
export const WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function groupAvailabilityRules(rules: AvailabilityRule[]): RuleGroup[] {
  const map = new Map<string, RuleGroup>();
  for (const r of rules) {
    const modesKey = [...r.modes].sort().join(",");
    const key = `${r.start_time}|${r.end_time}|${r.slot_step}|${modesKey}|${r.label ?? ""}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        start_time: r.start_time,
        end_time: r.end_time,
        slot_step: r.slot_step,
        modes: r.modes,
        label: r.label,
        byDay: [null, null, null, null, null, null, null],
      };
      map.set(key, g);
    }
    g.byDay[r.weekday] = r.id;
  }
  return [...map.values()].sort((a, b) =>
    a.start_time === b.start_time
      ? a.end_time.localeCompare(b.end_time)
      : a.start_time.localeCompare(b.start_time),
  );
}

/** Tutti gli id della regola presenti nel gruppo (per l'eliminazione in blocco). */
export const groupIds = (g: RuleGroup): string[] =>
  g.byDay.filter((id): id is string => id != null);
