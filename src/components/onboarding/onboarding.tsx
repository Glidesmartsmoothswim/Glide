"use client";

import { useRef, useState } from "react";
import { setOnboardingDone } from "@/app/app/profilo/actions";

/**
 * Onboarding nuotatore — 6 schermate (GLIDE_ONBOARDING.md, copy IDENTICO).
 * La schermata 2 (il patto) NON è skippabile; skip ammesso dalla 3 in poi.
 * Mostrato una sola volta: il "visto" è su `profiles.onboarding_done`
 * (non più localStorage, che si ripresenta su ogni device).
 */
type Screen = { title: string; body: React.ReactNode };

const SCREENS: Screen[] = [
  {
    title: "Onda dopo onda.",
    body: (
      <>
        <p>
          GLIDE è dove trovi i tuoi allenamenti, dove mi dici come stai, e dove
          vediamo insieme se stai migliorando davvero.
        </p>
        <p>Due minuti e sei dentro.</p>
        <p className="t-small text-muted">— Alessio</p>
      </>
    ),
  },
  {
    title: "Non è un esame.",
    body: (
      <>
        <p>
          Prima di ogni seduta ti chiedo cinque cose. Come hai dormito, quanta
          energia hai, come sta il corpo, come stai di testa, quanta voglia hai.
        </p>
        <p>
          <b>Non esistono risposte giuste.</b> Nessuno ti giudica, nessuno ti dà
          un voto.
        </p>
        <p>
          Se scrivi che stai bene quando stai a pezzi, non stai ingannando me:{" "}
          <b>ti stai togliendo l&apos;unico strumento che ho per allenarti come
          si deve.</b>
        </p>
        <p>Trenta secondi. La verità, com&apos;è quel giorno.</p>
      </>
    ),
  },
  {
    title: "Cinque domande. Trenta secondi.",
    body: (
      <>
        <p>
          <b>5 è sempre la risposta migliore.</b> Sempre. Su tutte e cinque. Non
          devi ricordarti quale scala va al contrario, perché non ce n&apos;è
          nessuna.
        </p>
        <p>Sotto ogni numero c&apos;è scritto cosa significa. Leggi e tappa.</p>
        <p>
          Se il corpo fa male, ti chiedo <b>dove</b>. Serve a capire se una cosa
          torna, o se è capitata una volta.
        </p>
      </>
    ),
  },
  {
    title: "Due domande.",
    body: (
      <>
        <p>
          <b>Quanto è stata dura.</b> Da 1 (passeggiata) a 10 (non avevo altro da
          dare). Non c&apos;è un valore giusto: se una seduta facile ti sembra
          facile, ha funzionato.
        </p>
        <p>
          <b>Come stai adesso.</b> Su questa seconda ci tengo. Perché tra sei mesi
          voglio poterti dire una cosa che nessun cronometro ti dirà mai:
        </p>
        <p className="t-body-lg">
          «Sei entrato in acqua 87 volte. 79 volte ne sei uscito meglio di come
          sei entrato.»
        </p>
        <p>Quello, per me, conta più di un record.</p>
      </>
    ),
  },
  {
    title: "Come funziona · e come non funziona",
    body: (
      <>
        <p>
          <b>L&apos;allenamento lo scrivo io.</b> GLIDE mi mostra i tuoi numeri.
          Le decisioni sul carico restano mie. Sempre. Nessun algoritmo ti alza o
          ti abbassa i metri.
        </p>
        <p>
          <b>GLIDE non è un medico.</b> Se hai dolore, lo segnalo a me. Se il
          dolore è forte o non passa, vai da un medico — non da un&apos;app. Se
          senti qualcosa al petto, al respiro o alla testa: fermati e chiama un
          medico.
        </p>
        <p>
          <b>Il cronometro non è tutto.</b> A 50 anni i tempi rallentano. La
          tecnica, l&apos;efficienza e la costanza no: quelle migliorano finché
          hai voglia di migliorarle. GLIDE misura anche quelle.
        </p>
      </>
    ),
  },
  {
    title: "Mettila in tasca.",
    body: (
      <>
        <p>
          <b>iPhone</b> → Condividi → <i>Aggiungi a Home</i>
        </p>
        <p>
          <b>Android</b> → menu ⋮ → <i>Installa app</i>
        </p>
        <p>Si apre come un&apos;app normale. Funziona anche con poca rete.</p>
      </>
    ),
  },
];

export function Onboarding({ done }: { done: boolean }) {
  const [step, setStep] = useState<number>(done ? -1 : 0);
  const touch = useRef<{ x: number; y: number } | null>(null);

  if (step === -1) return null;

  const last = step === SCREENS.length - 1;
  const canSkip = step >= 2; // dalla terza in poi; la 2 (index 1) NO
  const finish = () => {
    setStep(-1);
    void setOnboardingDone(); // persiste il flag sul profilo
  };
  const next = () => (last ? finish() : setStep((s) => s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));
  const sc = SCREENS[step];

  // Scorrimento laterale: swipe sinistra = avanti, destra = indietro.
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return; // gesto verticale
    if (dx < 0) next();
    else prev();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink text-white">
      {/* Contenuto scrollabile: su schermi piccoli il testo lungo scorre,
          senza mai spingere fuori il pulsante. */}
      <div
        className="flex-1 overflow-y-auto px-6 pt-6"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-5 py-4">
          <div className="flex gap-1.5">
            {SCREENS.map((_, i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= step ? "bg-turchese" : "bg-white/20"}`}
              />
            ))}
          </div>
          <h1 className="t-h1">{sc.title}</h1>
          <div className="flex flex-col gap-3 t-body-lg text-white/90">
            {sc.body}
          </div>
        </div>
      </div>

      {/* Barra azioni: sempre visibile, ancorata in basso (safe-area inclusa). */}
      <div className="shrink-0 border-t border-white/10 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
        <div className="mx-auto flex w-full max-w-md items-center justify-between">
          {canSkip ? (
            <button onClick={finish} className="t-small text-white/60">
              Salta
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={next}
            className="rounded-xl bg-gradient-to-br from-blu to-navy px-6 py-3 font-bold text-white"
          >
            {last ? "Inizia" : "Avanti"}
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-white/30">
          Scorri lateralmente o usa il pulsante
        </p>
      </div>
    </div>
  );
}
