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
};
