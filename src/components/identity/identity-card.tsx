// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { Card } from "@/components/ui/card";
import type { Identity } from "@/lib/identity";

/**
 * Lo specchio (§6): riconoscimento, non richiesta. Compare solo quando c'è
 * — niente countdown, niente barre di avvicinamento: uno specchio che ti
 * dice "manca poco per sapere chi sei" sarebbe un gioco, e questo non lo è.
 */
export function IdentityCard({ identity }: { identity: Identity | null }) {
  if (!identity) return null;
  return (
    <Card className="bg-gradient-to-br from-ink to-navy text-white">
      <p className="t-label text-white/60">In acqua sei</p>
      <p className="t-h2 mt-1">{identity.name}</p>
      <p className="t-body mt-2 text-white/85">{identity.mirror}</p>
    </Card>
  );
}
