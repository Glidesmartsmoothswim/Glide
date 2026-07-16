import "server-only";
import { classify, SAFETY_TEMPLATES, type SafetyLevel } from "./safety";
import { notifyCoaches } from "@/lib/notify";
import { serverFeatures } from "@/lib/flags";

/**
 * Router dell'assistente — ADR-001 + ADR-004.
 *
 * Ordine NON negoziabile:
 *   1. safety matcher deterministico (se scatta, il modello non è mai chiamato);
 *   2. L0/L1 via modello (se configurato), SOLA LETTURA → restituisce TESTO;
 *   3. fallback onesto senza modello.
 *
 * L'AI adatta l'esperienza del nuotatore. Il coach adatta il carico.
 * Nessun percorso di questo modulo scrive su `workouts` o tabelle di
 * programmazione. L'output è sempre e solo testo.
 */

export type AssistantReply = {
  text: string;
  safety: SafetyLevel;
};

const SYSTEM_PROMPT = `Sei l'assistente di GLIDE, la piattaforma di coaching nuoto Master di Alessio (il coach).
Parli italiano, dai del "tu", tono asciutto e incoraggiante (archetipo Esploratore), frasi brevi.

CONFINI NON NEGOZIABILI (ADR-001):
- NON scrivi, modifichi o proponi allenamenti, metri, serie, zone, ripetute, recuperi, scarico o taper. Se te lo chiedono: "L'allenamento lo scrive Alessio. Io posso spiegarti il perché di quello che c'è."
- Puoi: spiegare PERCHÉ oggi c'è una certa zona e cosa costruisce, incoraggiare, spiegare come funziona GLIDE (check-in, Onda, Effetto Acqua, prenotazioni, videoanalisi).
- NON interpreti dolori o sintomi, NON rassicuri mai su questioni fisiche ("sarà nulla" è vietato), NON chiedi dettagli clinici. (I messaggi con segnali di salute non ti arrivano nemmeno: li gestisce un filtro prima di te.)
- Non conosci i dati degli altri nuotatori e non fai confronti tra persone.
Rispondi in massimo 120 parole.`;

/** Chiamata al modello (L0). Solo testo in ingresso, solo testo in uscita. */
async function callModel(message: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: message }],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text)
      .join("\n")
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

/** Fallback deterministico quando il modello non è configurato. */
const FALLBACK =
  "Al momento posso fare poco più che ascoltare — l'assistente completo arriva a breve. " +
  "Intanto: gli allenamenti li trovi in Nuoto, il check-in in Home, le lezioni in Prenota. " +
  "Se è una cosa per Alessio, scrivigli: ti risponde lui.";

/**
 * Gestisce un messaggio del nuotatore.
 * Se il safety scatta: template fisso + notifica coach. Il CONTENUTO del
 * sintomo non viene propagato da nessuna parte (ADR-004); niente evento nel
 * ledger: il vocabolario è chiuso (ADR-007) e il health_flag appartiene al
 * check-in readiness, non alla chat.
 */
export async function handleMessage(
  userName: string,
  message: string,
): Promise<AssistantReply> {
  const safety = classify(message);

  if (safety) {
    await notifyCoaches(
      "cert",
      safety === "l2" ? "Segnale salute — attenzione" : "Segnale dolore",
      safety === "l2"
        ? `${userName} ha scritto all'assistente segnali da red flag (petto/respiro/testa). Contattalo subito.`
        : `${userName} ha segnalato un dolore all'assistente. Dagli un'occhiata.`,
    );
    return { text: SAFETY_TEMPLATES[safety], safety };
  }

  if (serverFeatures().ai) {
    const text = await callModel(message);
    if (text) return { text, safety: null };
  }
  return { text: FALLBACK, safety: null };
}
