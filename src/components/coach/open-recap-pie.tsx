"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export type { PieSlice } from "./open-recap-pie-impl";

/** recharts lazy (ssr:false): fuori dal bundle iniziale della scheda coach. */
export const OpenRecapPie = dynamic(
  () => import("./open-recap-pie-impl").then((m) => m.OpenRecapPie),
  { ssr: false, loading: () => <Skeleton className="h-56 w-full" /> },
);
