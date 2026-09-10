// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import { redirect } from "next/navigation";
import { getCurrentProfile, homeForRole } from "@/lib/auth";

/**
 * Punto d'ingresso: instrada in base al ruolo.
 * - non loggato        → /login
 * - coach              → /coach  (gestionale desktop)
 * - swimmer            → /app    (PWA mobile)
 */
export default async function RootPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  redirect(homeForRole(profile.role));
}
