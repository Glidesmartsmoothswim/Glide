import { redirect } from "next/navigation";
import { getCurrentProfile, homeForRole } from "@/lib/auth";

/**
 * Punto d'ingresso: instrada in base al ruolo.
 * - non loggato        → /login
 * - coach              → /coach  (gestionale desktop)
 * - swimmer            → /app    (PWA mobile)
 */
export default async function RootPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  redirect(homeForRole(profile.role));
}
