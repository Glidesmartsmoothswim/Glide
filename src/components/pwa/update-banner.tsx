"use client";

import { useEffect, useRef, useState } from "react";

/**
 * PROMPT_CODE_APP_UPDATE TASK 2/3 (01/09/2026) — dopo un deploy, chi ha
 * già l'app aperta (soprattutto PWA da home screen) non se ne accorge da
 * solo. Banner discreto, non modale, non bloccante: mai reload automatico
 * senza interazione, potrebbe interrompere un atleta a metà form.
 *
 * Rilevamento nuova versione, due segnali indipendenti:
 *  - fetch a /api/version: al mount (sha "attivo"), poi su
 *    visibilitychange/focus e ogni ~10 minuti se la tab resta aperta.
 *    Su iOS le PWA da home screen controllano aggiornamenti solo quando
 *    tornano in foreground — mai in vero background — quindi QUESTO è il
 *    meccanismo primario per quegli utenti, non un extra opzionale.
 *  - `controllerchange` sul service worker (public/sw.js, se presente):
 *    lo stesso banner, non un secondo meccanismo — il SW lì chiama già
 *    skipWaiting()/clients.claim() in automatico, quindi controllerchange
 *    è il segnale che una nuova versione ha già preso il controllo.
 */
const POLL_MS = 10 * 60 * 1000; // ~10 minuti

async function fetchSha(): Promise<string | null> {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { sha?: unknown };
    return typeof data.sha === "string" ? data.sha : null;
  } catch {
    return null;
  }
}

export function UpdateBanner() {
  const [available, setAvailable] = useState(false);
  const activeSha = useRef<string | null>(null);
  const checking = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      if (checking.current) return;
      checking.current = true;
      const sha = await fetchSha();
      checking.current = false;
      if (cancelled || !sha) return;
      if (activeSha.current === null) {
        activeSha.current = sha; // primo giro: salva lo sha attivo
        return;
      }
      if (sha !== activeSha.current) setAvailable(true);
    };

    check();

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    const interval = setInterval(check, POLL_MS);

    const onControllerChange = () => {
      if (!cancelled) setAvailable(true);
    };
    const sw = "serviceWorker" in navigator ? navigator.serviceWorker : undefined;
    sw?.addEventListener("controllerchange", onControllerChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      clearInterval(interval);
      sw?.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!available) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm shadow-lg sm:inset-x-auto sm:right-4 sm:max-w-xs">
      <span className="text-foreground">Nuova versione disponibile</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="shrink-0 rounded-lg bg-gradient-to-br from-blu to-navy px-3 py-1.5 text-sm font-bold text-white"
      >
        Aggiorna
      </button>
    </div>
  );
}
