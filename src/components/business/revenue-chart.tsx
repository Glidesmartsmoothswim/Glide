"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export type { RevPoint } from "./revenue-chart-impl";

/**
 * Onda 13.1 — recharts lazy (ssr:false): fuori dal bundle iniziale del
 * gestionale, skeleton mentre carica.
 */
export const RevenueChart = dynamic(
  () => import("./revenue-chart-impl").then((m) => m.RevenueChart),
  { ssr: false, loading: () => <Skeleton className="h-56 w-full" /> },
);
