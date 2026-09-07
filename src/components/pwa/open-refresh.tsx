"use client";

import { useEffect } from "react";

/**
 * PROMPT_CODE_ALLENAMENTI_OPEN TASK 7 — refresh forzato all'ingresso sul
 * Canale Open.
 *
 * Gli atleti con la PWA installata restano su una versione cachata: non
 * vedono né le funzionalità nuove né gli allenamenti nuovi. Al montaggio:
 *
 *  1. se c'è già un service worker in attesa (`registration.waiting`), gli
 *     mandiamo `SKIP_WAITING` e ricarichiamo UNA sola volta;
 *  2. in più chiediamo un `update()` — su iOS la PWA da home screen controlla
 *     gli aggiornamenti solo quando torna in foreground, quindi senza questa
 *     spinta il worker nuovo non arriva mai. `public/sw.js` fa già
 *     `skipWaiting()` in install, quindi di norma il segnale che una nuova
 *     versione ha preso il controllo è `controllerchange`.
 *
 * Ricarichiamo solo se un controller c'era GIÀ: la prima acquisizione (il
 * `clients.claim()` di una registrazione appena fatta) non è un
 * aggiornamento, e non deve far ripartire la pagina.
 *
 * Guardia anti-loop obbligatoria: un flag in `sessionStorage`, un solo reload
 * per sessione. Se `sessionStorage` non è accessibile (Safari privato) non
 * ricarichiamo affatto — meglio una versione vecchia che un loop di reload.
 *
 * Se non c'è nessun aggiornamento, non fa e non mostra nulla: l'avviso
 * esplicito "Nuova versione disponibile" resta di UpdateBanner.
 */
const FLAG = "glide:open-refresh";
const FALLBACK_MS = 3000;

export function OpenChannelRefresh() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Guardia anti-loop: già ricaricato in questa sessione → stop.
    // Storage non leggibile → non ricarichiamo (fail-safe, mai un loop).
    try {
      if (sessionStorage.getItem(FLAG) === "1") return;
    } catch {
      return;
    }

    const sw = navigator.serviceWorker;
    // Nessun controller = la pagina non è servita da un service worker: non
    // c'è nessuna versione cachata da superare.
    if (!sw.controller) return;

    let cancelled = false;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const reloadOnce = () => {
      if (done || cancelled) return;
      done = true;
      try {
        sessionStorage.setItem(FLAG, "1");
      } catch {
        return; // senza flag non ricarichiamo: il loop è il rischio peggiore
      }
      window.location.reload();
    };

    sw.addEventListener("controllerchange", reloadOnce);

    sw.getRegistration()
      .then((reg) => {
        if (cancelled || !reg) return;
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
          // Su iOS `controllerchange` può non arrivare: ricarichiamo comunque,
          // sempre una volta sola (la guardia è la stessa).
          timer = setTimeout(reloadOnce, FALLBACK_MS);
          return;
        }
        // Nessuno in attesa: chiediamo se ce n'è uno nuovo. Se c'è, si
        // installa, prende il controllo (skipWaiting in sw.js) e
        // `controllerchange` fa il reload. Se non c'è, non succede nulla.
        reg.update().catch(() => {});
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      sw.removeEventListener("controllerchange", reloadOnce);
    };
  }, []);

  return null;
}
