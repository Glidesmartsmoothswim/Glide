"use client";

import { useEffect } from "react";

/**
 * Registra il service worker (/sw.js) lato client.
 * Necessario per rendere la PWA installabile.
 */
export function RegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silenzioso: l'installabilità è un miglioramento, non un requisito
        // per il funzionamento dell'app.
      });
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
