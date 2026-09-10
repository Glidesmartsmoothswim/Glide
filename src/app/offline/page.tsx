// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { WaveLogo } from "@/components/brand/wave-logo";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="splash-bg flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <WaveLogo height={56} plate={false} />
      <div>
        <h1 className="font-display text-2xl text-white dark:text-foreground">
          Sei offline
        </h1>
        <p className="mt-1 max-w-xs text-sm text-[#c7d4ee] dark:text-muted">
          Nessuna connessione. Le tue schede tornano appena sei di nuovo in
          rete — onda dopo onda.
        </p>
      </div>
    </main>
  );
}
