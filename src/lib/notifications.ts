// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

import type { NotifType } from "@/lib/notify";

export type NotificationRow = {
  id: string;
  user_id: string;
  type: NotifType | null;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

export const NOTIF_EMOJI: Record<NotifType, string> = {
  open: "📣",
  cert: "📄",
  video: "🎬",
  birra: "🍺",
  retention: "⏳",
  pay: "💳",
  plan: "🏊",
  booking: "📅",
  richiesta: "💬",
};
