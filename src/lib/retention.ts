import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { removeVideoObject } from "@/lib/storage";
import { logEvent } from "@/lib/ledger";

/**
 * Parametri di retention (§2.2). NON hardcoded nella logica: li tari qui.
 */
export const RETENTION = {
  /** Finestra di ripensamento dopo la cancellazione utente. */
  softDeleteGraceDays: 7,
  /** Grazia dopo l'archiviazione (chiusura macrociclo) prima del purge. */
  archiveGraceDays: 90,
  /** Video "preservati ✦" per nuotatore (mai purgati). */
  maxPreserved: 3,
  /** Fallback per chi non ha macrocicli (Open/non agonisti): mesi dall'upload. */
  openRetentionDays: 365,
};

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

/** Giorni al purge di un video archiviato (+90gg dall'archiviazione), >=0. */
export function daysToPurge(archivedAt: string | null): number | null {
  if (!archivedAt) return null;
  const elapsed = (Date.now() - new Date(archivedAt).getTime()) / DAY;
  return Math.max(0, Math.ceil(RETENTION.archiveGraceDays - elapsed));
}

/**
 * Archivia i video di un macrociclo (chiusura programma, §2.2).
 * Passa da `active` ad `archived`; i `preserved` restano intoccati.
 * Il purge effettivo avviene +90gg dal cron. Usa il client admin.
 */
export async function archiveProgramVideos(
  admin: SupabaseClient,
  programId: string,
): Promise<number> {
  const { data } = await admin
    .from("race_videos")
    .update({ retention_state: "archived", archived_at: new Date().toISOString() })
    .eq("program_id", programId)
    .eq("retention_state", "active")
    .is("deleted_at", null)
    .select("id");
  return data?.length ?? 0;
}

/**
 * Purge fisico (cron giornaliero). Rimuove il FILE e trasforma la riga in
 * tombstone (`purged_at`, `storage_path=null`), SENZA cancellare la riga:
 * i commenti del coach (FK CASCADE) devono sopravvivere. Mai i `preserved`.
 * Ritorna il numero di video purgati.
 */
export async function purgeExpiredVideos(admin: SupabaseClient): Promise<number> {
  // Candidati: (a) soft-deleted da > graziaSoft; (b) archiviati da > grazia90;
  // (c) fallback Open: attivi non archiviati e non preservati, upload > 365gg.
  const { data: candidates } = await admin
    .from("race_videos")
    .select("id, swimmer_id, storage_path, retention_state, deleted_at, archived_at, created_at")
    .is("purged_at", null)
    .neq("retention_state", "preserved");

  let purged = 0;
  for (const v of candidates ?? []) {
    const softExpired =
      v.deleted_at && v.deleted_at < daysAgo(RETENTION.softDeleteGraceDays);
    const archiveExpired =
      v.retention_state === "archived" &&
      v.archived_at &&
      v.archived_at < daysAgo(RETENTION.archiveGraceDays);
    const openExpired =
      v.retention_state === "active" &&
      !v.deleted_at &&
      v.created_at < daysAgo(RETENTION.openRetentionDays);

    if (!softExpired && !archiveExpired && !openExpired) continue;

    await removeVideoObject(v.storage_path as string | null);
    await admin
      .from("race_videos")
      .update({ purged_at: new Date().toISOString(), storage_path: null })
      .eq("id", v.id);
    // Il ledger resta append-only; logghiamo il purge solo se era una
    // cancellazione utente non ancora tracciata (soft delete → già loggato).
    if (openExpired || archiveExpired) {
      await logEvent(admin, v.swimmer_id as string, "video.deleted", {
        video_id: v.id,
        by: "system",
        had_analysis: false,
      });
    }
    purged += 1;
  }
  return purged;
}
