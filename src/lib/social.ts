export type Pillar = "consigli" | "allenamento" | "gare" | "coach" | "su_di_me";
export type PostType = "openplan" | "chiuso" | "design";
export type Channel = "instagram" | "tiktok" | "youtube";
export type PostStatus = "draft" | "scheduled" | "published";

export type SocialPostRow = {
  id: string;
  pillar: Pillar | null;
  post_type: PostType | null;
  channel: Channel | null;
  status: PostStatus;
  scheduled_at: string | null;
  caption: string | null;
  media_path: string | null;
  created_at: string;
};

export const PILLARS: { id: Pillar; label: string }[] = [
  { id: "consigli", label: "Consigli" },
  { id: "allenamento", label: "Allenamento" },
  { id: "gare", label: "Gare" },
  { id: "coach", label: "Coach" },
  { id: "su_di_me", label: "Su di me" },
];

// Regole feed (dal prototipo POST_TYPE)
export const POST_TYPES: Record<
  PostType,
  { label: string; color: string; bg: string }
> = {
  openplan: { label: "Open plan", color: "#203979", bg: "#E7F0FA" },
  chiuso: { label: "Chiuso", color: "#0B7A6E", bg: "#E0FBF7" },
  design: { label: "Design", color: "#7C3AED", bg: "#EDE9FE" },
};

export const CHANNELS: { id: Channel; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
];

export const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Bozza",
  scheduled: "Programmato",
  published: "Pubblicato",
};

export const pillarLabel = (p: Pillar | null) =>
  PILLARS.find((x) => x.id === p)?.label ?? "—";
