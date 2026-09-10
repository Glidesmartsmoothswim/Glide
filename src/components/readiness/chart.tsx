"use client";
// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export type { Point } from "./chart-impl";

/**
 * Onda 13.1 — carica recharts in modo lazy (ssr:false): il grafico non pesa
 * sul bundle iniziale né sul primo paint; intanto mostra uno skeleton.
 */
export const ReadinessChart = dynamic(
  () => import("./chart-impl").then((m) => m.ReadinessChart),
  {
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full" />,
  },
);
