"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { removeLibraryObject } from "@/lib/storage";
import { TIERS } from "@/lib/access";
import type { LibraryKind } from "@/lib/library";

export type LibraryState = { error?: string; info?: string; id?: string };

const KINDS: LibraryKind[] = ["pdf", "video", "link"];

function parseCommon(fd: FormData) {
  const title = String(fd.get("title") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim() || null;
  const rawKind = String(fd.get("kind") ?? "pdf");
  const kind: LibraryKind = KINDS.includes(rawKind as LibraryKind)
    ? (rawKind as LibraryKind)
    : "pdf";
  const rawVis = String(fd.get("visibility") ?? "free");
  const visibility = (TIERS as readonly string[]).includes(rawVis)
    ? rawVis
    : "free";
  const url = String(fd.get("url") ?? "").trim() || null;
  const file_key = String(fd.get("file_key") ?? "").trim() || null;
  const cover_key = String(fd.get("cover_key") ?? "").trim() || null;
  return { title, description, kind, visibility, url, file_key, cover_key };
}

/** Crea un contenuto libreria (il file è già su storage, arriva la key). */
export async function createLibraryItem(
  _prev: LibraryState,
  fd: FormData,
): Promise<LibraryState> {
  await requireRole("coach");
  const c = parseCommon(fd);
  if (!c.title) return { error: "Serve un titolo." };
  if (c.kind === "link" && !c.url)
    return { error: "Un contenuto 'link' richiede un URL." };
  if (c.kind === "pdf" && !c.file_key)
    return { error: "Carica il file PDF prima di salvare." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("library_items")
    .insert({
      title: c.title,
      description: c.description,
      kind: c.kind,
      url: c.url,
      file_key: c.file_key,
      cover_key: c.cover_key,
      visibility: c.visibility,
      published: String(fd.get("published") ?? "") === "true",
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/coach/libreria");
  revalidatePath("/app/libreria");
  return { info: "Contenuto salvato.", id: data?.id as string };
}

/** Aggiorna i metadati (titolo/descrizione/visibilità/pubblicazione). */
export async function updateLibraryItem(
  _prev: LibraryState,
  fd: FormData,
): Promise<LibraryState> {
  await requireRole("coach");
  const id = String(fd.get("id") ?? "");
  if (!id) return { error: "Contenuto non valido." };
  const c = parseCommon(fd);
  if (!c.title) return { error: "Serve un titolo." };

  const patch: Record<string, unknown> = {
    title: c.title,
    description: c.description,
    kind: c.kind,
    url: c.url,
    visibility: c.visibility,
    published: String(fd.get("published") ?? "") === "true",
    updated_at: new Date().toISOString(),
  };
  // Le key file/cover si aggiornano solo se ne arriva una nuova.
  if (c.file_key) patch.file_key = c.file_key;
  if (c.cover_key) patch.cover_key = c.cover_key;

  const supabase = await createClient();
  const { error } = await supabase
    .from("library_items")
    .update(patch)
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/coach/libreria");
  revalidatePath("/app/libreria");
  return { info: "Aggiornato." };
}

/** Pubblica / nascondi. */
export async function togglePublish(id: string, next: boolean) {
  await requireRole("coach");
  const supabase = await createClient();
  await supabase
    .from("library_items")
    .update({ published: next, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/coach/libreria");
  revalidatePath("/app/libreria");
}

/** Elimina il contenuto e i suoi oggetti storage. */
export async function deleteLibraryItem(id: string) {
  await requireRole("coach");
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("library_items")
    .select("file_key, cover_key")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("library_items").delete().eq("id", id);
  if (item?.file_key) await removeLibraryObject(item.file_key as string);
  if (item?.cover_key) await removeLibraryObject(item.cover_key as string);
  revalidatePath("/coach/libreria");
  revalidatePath("/app/libreria");
}
