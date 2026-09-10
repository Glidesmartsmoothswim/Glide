#!/usr/bin/env node
// SPDX-License-Identifier: LicenseRef-GLIDE-Proprietary
// Copyright (c) 2026 Alessio Coppola. Tutti i diritti riservati.
// Parte di GLIDE. Riproduzione, modifica, distribuzione e utilizzo per
// l'addestramento di sistemi di intelligenza artificiale sono vietati
// senza autorizzazione scritta. Vedi LICENSE e NOTICE in radice.

/**
 * GLIDE — verifica che ogni file sorgente tracciato porti l'intestazione SPDX.
 * Esce con codice 1 se ne manca almeno una. Pensato per la CI.
 *
 * Uso: node scripts/check-license-headers.mjs
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { extname, basename } from "node:path";

const SPDX_ID = "LicenseRef-GLIDE-Proprietary";

const MANAGED_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts",
  ".css", ".sql", ".sh", ".bash", ".svg",
]);

const SKIP_BASENAMES = new Set(["next-env.d.ts"]);
const SKIP_PATH_PREFIXES = ["public/fonts/", "public/icons/"];

// File di terzi: asset lasciati da `create-next-app` (i loghi Next.js e Vercel
// sono marchi altrui). Non sono nostri: non vanno intestati né pretesi.
const SKIP_PATHS = new Set([
  "public/file.svg",
  "public/globe.svg",
  "public/next.svg",
  "public/vercel.svg",
  "public/window.svg",
]);

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const missing = [];
const wrongId = [];
let checked = 0;

for (const file of files) {
  if (!MANAGED_EXTS.has(extname(file))) continue;
  if (SKIP_BASENAMES.has(basename(file))) continue;
  if (SKIP_PATH_PREFIXES.some((p) => file.startsWith(p))) continue;
  if (SKIP_PATHS.has(file)) continue;

  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  checked++;

  // Cerca solo nelle prime righe: un SPDX sepolto a metà file non conta.
  const head = content.split("\n").slice(0, 15).join("\n");
  if (!head.includes("SPDX-License-Identifier")) {
    missing.push(file);
  } else if (!head.includes(`SPDX-License-Identifier: ${SPDX_ID}`)) {
    wrongId.push(file);
  }
}

if (missing.length === 0 && wrongId.length === 0) {
  console.log(`OK — intestazione presente su tutti i ${checked} file gestiti.`);
  process.exit(0);
}

if (missing.length > 0) {
  console.error(`\nIntestazione MANCANTE su ${missing.length} file:`);
  for (const f of missing) console.error(`  - ${f}`);
}
if (wrongId.length > 0) {
  console.error(`\nIdentificativo SPDX diverso da "${SPDX_ID}" su ${wrongId.length} file:`);
  for (const f of wrongId) console.error(`  - ${f}`);
  console.error("  (attenzione: potrebbe essere codice di terzi finito nel repo)");
}
console.error("\nRimedio: node scripts/add-license-headers.mjs");
process.exit(1);
