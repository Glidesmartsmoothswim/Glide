/**
 * Genera la matrice completa degli abbonamenti 1:1 Elite (tutte le
 * combinazioni allenamenti/sett × cadenza check-in × canale) leggendo
 * `src/lib/payment/elite-pricing.ts` — l'unica fonte di verità dei prezzi.
 *
 * Output (rigenerabili, mai da editare a mano):
 *  - docs/GLIDE_ELITE_MATRICE_ABBONAMENTI.md  (documento leggibile)
 *  - docs/glide-elite-matrice-mensile.csv     (48 combinazioni)
 *  - docs/glide-elite-matrice-stagione.csv    (48 × 12 mesi di iscrizione)
 *
 * Uso:  npx tsx scripts/gen-elite-matrix.ts
 *
 * Nota: la stagione prepagata dipende dal MESE di iscrizione
 * (`seasonEnrollment` in src/lib/payment/pricing.ts), non è un fisso ×10 —
 * per questo il CSV stagione ha una riga per ogni mese di iscrizione.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  WORKOUT_FREQUENCIES,
  CHECKIN_CADENCES,
  CHECKIN_CADENCE_LABEL,
  CHECKIN_CHANNELS,
  CHECKIN_CHANNEL_LABEL,
  WORKOUT_FREQUENCY_PRICE_CENTS,
  CHECKIN_CREDIT_PRICE_CENTS,
  ELITE_ENTRY_PRICE_CENTS,
  eliteMonthlyPriceCents,
  eliteTotalPriceCents,
  eliteSeasonQuote,
  eliteSelectionLabel,
  billingPeriodForCadence,
  type EliteSelection,
} from "../src/lib/payment/elite-pricing";
import { seasonEnrollment } from "../src/lib/payment/pricing";

const ROOT = join(import.meta.dirname, "..");

/** Formattazione IT (virgola decimale), come nelle pagine pubbliche. */
const eur = (cents: number) =>
  (cents / 100).toLocaleString("it-IT", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

const CADENCE_SHORT: Record<(typeof CHECKIN_CADENCES)[number], string> = {
  bimestrale: "bimestre",
  mensile: "mensile",
  due_al_mese: "bisettimanale",
  settimanale: "settimanale",
};

const MONTH_LABEL = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const combos: EliteSelection[] = [];
for (const allenamenti of WORKOUT_FREQUENCIES)
  for (const cadenza of CHECKIN_CADENCES)
    for (const canale of CHECKIN_CHANNELS)
      combos.push({ allenamenti, cadenza, canale });

/** Un mese-campione per ogni mese di iscrizione (giorno 15, UTC, anno arbitrario). */
const enrollmentDate = (month1to12: number) =>
  new Date(Date.UTC(2026, month1to12 - 1, 15));

// ── CSV mensile ────────────────────────────────────────────────────────
const csvMonthly = [
  "allenamenti_settimana;cadenza_checkin;canale;canone_A_eur;credito_B_eur;mensile_equivalente_eur;periodo_fatturazione;importo_per_addebito_eur;descrizione",
  ...combos.map((sel) => {
    const periodo = billingPeriodForCadence(sel.cadenza);
    return [
      sel.allenamenti,
      CADENCE_SHORT[sel.cadenza],
      sel.canale,
      eur(WORKOUT_FREQUENCY_PRICE_CENTS[sel.allenamenti]),
      eur(CHECKIN_CREDIT_PRICE_CENTS[sel.cadenza][sel.canale]),
      eur(eliteMonthlyPriceCents(sel)),
      periodo,
      eur(eliteTotalPriceCents(sel, periodo)),
      eliteSelectionLabel(sel, periodo),
    ].join(";");
  }),
].join("\n");

// ── CSV stagione prepagata (per mese di iscrizione) ────────────────────
const csvSeason = [
  "allenamenti_settimana;cadenza_checkin;canale;mese_iscrizione;mesi_pagati;mensile_equivalente_eur;totale_pieno_eur;sconto_pct;totale_scontato_eur",
  ...combos.flatMap((sel) =>
    MONTH_LABEL.map((label, i) => {
      const q = eliteSeasonQuote(sel, enrollmentDate(i + 1));
      return [
        sel.allenamenti,
        CADENCE_SHORT[sel.cadenza],
        sel.canale,
        label,
        q.months,
        eur(q.monthlyCents),
        eur(q.fullCents),
        Math.round(q.discount * 100),
        eur(q.discountedCents),
      ].join(";");
    }),
  ),
].join("\n");

// ── Documento markdown ─────────────────────────────────────────────────
const monthlyGrid = (canale: (typeof CHECKIN_CHANNELS)[number]) =>
  [
    `| allenamenti/sett | ${CHECKIN_CADENCES.map((c) => CADENCE_SHORT[c]).join(" | ")} |`,
    `|---|${CHECKIN_CADENCES.map(() => "---").join("|")}|`,
    ...WORKOUT_FREQUENCIES.map(
      (allenamenti) =>
        `| ${allenamenti} | ${CHECKIN_CADENCES.map((cadenza) =>
          eur(eliteMonthlyPriceCents({ allenamenti, cadenza, canale })),
        ).join(" € | ")} € |`,
    ),
  ].join("\n");

const fullRows = combos
  .map((sel, i) => {
    const periodo = billingPeriodForCadence(sel.cadenza);
    const q = eliteSeasonQuote(sel, enrollmentDate(9)); // stagione piena (Sett→Giu)
    return `| ${i + 1} | ${sel.allenamenti} | ${CADENCE_SHORT[sel.cadenza]} | ${
      sel.canale
    } | ${eur(WORKOUT_FREQUENCY_PRICE_CENTS[sel.allenamenti])} € | ${eur(
      CHECKIN_CREDIT_PRICE_CENTS[sel.cadenza][sel.canale],
    )} € | **${eur(eliteMonthlyPriceCents(sel))} €** | ${periodo} | ${eur(
      eliteTotalPriceCents(sel, periodo),
    )} € | ${eur(q.discountedCents)} € |`;
  })
  .join("\n");

const enrollmentRows = MONTH_LABEL.map((label, i) => {
  const { months, discount, isPreSeason } = seasonEnrollment(enrollmentDate(i + 1));
  return `| ${label} | ${months} | ${Math.round(discount * 100)}% | ${
    isPreSeason ? "iscrizione anticipata (pre-stagione)" : "stagione già iniziata"
  } |`;
}).join("\n");

const md = `# GLIDE — Matrice abbonamenti 1:1 Elite (tutte le combinazioni)

> **Documento generato**, non editare a mano: \`npx tsx scripts/gen-elite-matrix.ts\`.
> Fonte di verità dei prezzi: \`src/lib/payment/elite-pricing.ts\` (+ \`src/lib/payment/pricing.ts\`
> per la stagione). Riferimento di prodotto: \`GLIDE_HANDOFF_PREZZI_FATTURAZIONE.md\` (v5, 30/08/2026).
>
> ⚠️ Tutte le cifre sono **prezzi di lancio, primo anno** — non un impegno permanente.

## Come si compone il prezzo

Due assi indipendenti, sommati per ottenere il **mensile-equivalente**:

- **Asse A — canone allenamenti/settimana** (programmazione scritta), floor a 2.
- **Asse B — credito check-in**, per cadenza × canale (in presenza / remoto).

Il **periodo di fatturazione non è una scelta a parte**: segue 1:1 la cadenza di check-in
(bimestre → incasso bimestrale a importo doppio; mensile/bisettimanale/settimanale → incasso mensile).
La **videoanalisi** (100 €) resta un prodotto standalone e non entra in questa matrice.

Combinazioni possibili: **${combos.length}** = ${WORKOUT_FREQUENCIES.length} frequenze × ${CHECKIN_CADENCES.length} cadenze × ${CHECKIN_CHANNELS.length} canali.
Entry price ("a partire da"): **${eur(ELITE_ENTRY_PRICE_CENTS)} €/mese** (2 allenamenti/sett + call/bimestre).

### Asse A — canone/mese

| allenamenti/sett | canone/mese |
|---|---|
${WORKOUT_FREQUENCIES.map(
  (n) => `| ${n} | ${eur(WORKOUT_FREQUENCY_PRICE_CENTS[n])} € |`,
).join("\n")}

### Asse B — credito check-in (€/mese-equivalente)

| cadenza | ${CHECKIN_CHANNELS.map((c) => CHECKIN_CHANNEL_LABEL[c]).join(" | ")} |
|---|${CHECKIN_CHANNELS.map(() => "---").join("|")}|
${CHECKIN_CADENCES.map(
  (cadenza) =>
    `| ${CADENCE_SHORT[cadenza]} — ${CHECKIN_CADENCE_LABEL[cadenza]} | ${CHECKIN_CHANNELS.map(
      (canale) => `${eur(CHECKIN_CREDIT_PRICE_CENTS[cadenza][canale])} €`,
    ).join(" | ")} |`,
).join("\n")}

## Matrice sintetica — mensile-equivalente

**In presenza (vasca)**

${monthlyGrid("presenza")}

**Remoto (call)**

${monthlyGrid("remoto")}

## Matrice completa — ${combos.length} combinazioni

- **mensile-eq.** = canone (A) + credito check-in (B).
- **addebito** = importo effettivamente incassato a ogni rinnovo (bimestrale = mensile × 2).
- **stagione** = prepagamento dell'intera stagione per chi si iscrive a settembre
  (10 mesi, −15%); per gli altri mesi di iscrizione vedi la tabella sotto e il CSV stagione.

| # | all./sett | cadenza check-in | canale | canone A | credito B | mensile-eq. | fatturazione | addebito | stagione (Sett, 10 mesi −15%) |
|---|---|---|---|---|---|---|---|---|---|
${fullRows}

## Stagione prepagata — mesi e sconto per mese di iscrizione

Mesi e sconto **non sono fissi**: derivano da \`seasonEnrollment\`. Luglio/agosto sono
iscrizione anticipata (10 mesi pieni, −15%); da settembre si pagano solo i mesi restanti
fino a fine giugno, con sconto 15% (Sett–Dic) o 10% (Gen–Giu).

Totale stagione = **mensile-eq. × mesi × (1 − sconto)**.

| mese di iscrizione | mesi pagati | sconto | tipo iscrizione |
|---|---|---|---|
${enrollmentRows}

## File collegati

- \`docs/glide-elite-matrice-mensile.csv\` — ${combos.length} combinazioni (canone, credito, mensile, addebito).
- \`docs/glide-elite-matrice-stagione.csv\` — ${combos.length} × 12 mesi di iscrizione (mesi, sconto, totale stagione).
`;

writeFileSync(join(ROOT, "docs/GLIDE_ELITE_MATRICE_ABBONAMENTI.md"), md);
writeFileSync(join(ROOT, "docs/glide-elite-matrice-mensile.csv"), csvMonthly + "\n");
writeFileSync(join(ROOT, "docs/glide-elite-matrice-stagione.csv"), csvSeason + "\n");

console.log(
  `matrice generata: ${combos.length} combinazioni · CSV stagione ${combos.length * 12} righe`,
);
