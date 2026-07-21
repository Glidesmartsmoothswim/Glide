import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { medicalSignedUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Apre il certificato medico di un atleta — SOLO il coach (13.2). L'URL
 * firmato è breve; il file non compare mai in liste/anteprime.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "coach")
    return NextResponse.redirect(new URL("/login", req.url));

  // RLS: il coach legge (is_coach). La query resta comunque scoping-safe.
  const supabase = await createClient();
  const { data: cert } = await supabase
    .from("medical_certificates")
    .select("file_key")
    .eq("swimmer_id", id)
    .order("data_scadenza", { ascending: false })
    .limit(1)
    .maybeSingle();

  const signed = await medicalSignedUrl(cert?.file_key ?? null, 300);
  if (!signed)
    return NextResponse.redirect(new URL(`/coach/nuotatori/${id}`, req.url));
  return NextResponse.redirect(signed);
}
