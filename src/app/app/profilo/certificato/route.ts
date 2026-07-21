import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { medicalSignedUrl } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Apre il PROPRIO certificato medico via URL firmato breve (13.2). */
export async function GET(req: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.redirect(new URL("/login", req.url));

  const supabase = await createClient();
  const { data: cert } = await supabase
    .from("medical_certificates")
    .select("file_key")
    .eq("swimmer_id", profile.id)
    .order("data_scadenza", { ascending: false })
    .limit(1)
    .maybeSingle();

  const signed = await medicalSignedUrl(cert?.file_key ?? null, 300);
  if (!signed) return NextResponse.redirect(new URL("/app/profilo", req.url));
  return NextResponse.redirect(signed);
}
