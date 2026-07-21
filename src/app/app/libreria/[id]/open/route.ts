import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { librarySignedUrl } from "@/lib/storage";
import { canOpenLibraryItem, type Visibility } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Apre un contenuto libreria applicando il gate lato SERVER (Onda 12.2):
 * l'URL firmato/esterno viene rilasciato solo se il tier del richiedente
 * può accedere alla visibilità del contenuto. Altrimenti torna alla libreria.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.redirect(new URL("/login", _req.url));

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("library_items")
    .select("kind, url, file_key, visibility, published")
    .eq("id", id)
    .maybeSingle();

  const back = new URL("/app/libreria", _req.url);
  if (!item || !item.published) return NextResponse.redirect(back);

  // GATE server: il tier deve poter aprire questa visibilità.
  if (!canOpenLibraryItem(profile.tier, item.visibility as Visibility)) {
    back.searchParams.set("locked", "1");
    return NextResponse.redirect(back);
  }

  if (item.kind === "link" || item.kind === "video") {
    if (!item.url) return NextResponse.redirect(back);
    return NextResponse.redirect(item.url);
  }

  const signed = await librarySignedUrl(item.file_key as string | null, 3600);
  if (!signed) return NextResponse.redirect(back);
  return NextResponse.redirect(signed);
}
