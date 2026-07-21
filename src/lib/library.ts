import type { Visibility } from "@/lib/access";

/** Onda 12.2 — tipi della Libreria. */
export type LibraryKind = "pdf" | "video" | "link";

export type LibraryItem = {
  id: string;
  title: string;
  description: string | null;
  kind: LibraryKind;
  file_key: string | null;
  url: string | null;
  cover_key: string | null;
  visibility: Visibility;
  published: boolean;
  sort: number;
  created_at: string;
  updated_at: string | null;
};

export const KIND_LABEL: Record<LibraryKind, string> = {
  pdf: "PDF",
  video: "Video",
  link: "Link",
};
